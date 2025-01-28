const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment');
const  PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');



const loadDashboard = async (req, res) => {
    try {
        // Get total counts for users, products, and orders
        let totalUsers = await User.countDocuments();
        let totalProducts = await Product.countDocuments();
        let totalOrders = await Order.countDocuments({status:"Delivered"});



          // Fetch total sales using the existing aggregation logic (keeping it as is)
        const Sales = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { 
                $group: {
                    _id: null,
                    totalSales: { 
                        $sum: { $cond: [{ $eq: ['$discount', 0] }, '$totalPrice', '$finalAmount'] }
                    }
                }
            }
        ]);

        const totalSales = Sales.length > 0 ? Sales[0].totalSales : 0;

        // Fetch total discounts (no change)
        const discount = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { 
                $group: {
                    _id: null,
                    discount: { $sum: '$discount' }
                }
    }]);
        const totalDiscount = discount.length > 0 ? discount[0].discount : 0;

        // Get recent orders
        const orders = await Order.find({ status: "Delivered" }).sort({ createdOn: -1 });


           // Fetch best-selling products
           const bestSellingProducts = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            { 
                $group: {
                    _id: '$orderedItems.product',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { 
                        $sum: { 
                            $multiply: [
                                { $toDouble: '$orderedItems.quantity' },
                                { $toDouble: '$orderedItems.price' }
                            ] 
                        }
                    },
                    productName: { $first: '$orderedItems.name' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            { $project: {
                productName: 1,
                totalQuantity: 1,
                totalRevenue: 1
            }}
        ]);




        const topBrands = await Order.aggregate([
            { $match: { status: 'Delivered' } }, // Match only delivered orders
            { $unwind: '$orderedItems' }, // Break down the orderedItems array
            {
                $lookup: { // Join with the Product collection
                    from: 'products', // Name of the Product collection
                    localField: 'orderedItems.product', // Field in the Order collection
                    foreignField: '_id', // Field in the Product collection
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' }, // Flatten the joined productDetails array
            {
                $group: { // Group by brand
                    _id: '$productDetails.brand',
                    totalQuantity: { $sum: '$orderedItems.quantity' }, // Total products sold
                    totalRevenue: {
                        $sum: {
                            $multiply: [
                                { $toDouble: '$orderedItems.quantity' },
                                { $toDouble: '$orderedItems.price' }
                            ]
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort by quantity sold
            { $limit: 10 }, // Limit to top 10 brands
            {
                $project: {
                    brand: '$_id',
                    totalQuantity: 1,
                    totalRevenue: 1,
                    _id: 0
                }
            }
        ]);
        
   

        const topCategories = await Order.aggregate([
            { $match: { status: 'Delivered' } }, // Match only delivered orders
            { $unwind: '$orderedItems' }, // Break down the orderedItems array
            {
                $lookup: { // Join with the Product collection
                    from: 'products', // Name of the Product collection
                    localField: 'orderedItems.product', // Field in the Order collection
                    foreignField: '_id', // Field in the Product collection
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' }, // Flatten the joined productDetails array
            {
                $lookup: { // Join with the Category collection to fetch category name
                    from: 'categories', // Name of the Category collection
                    localField: 'productDetails.category', // Category ID in the Product collection
                    foreignField: '_id', // Field in the Category collection
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' }, // Flatten the joined categoryDetails array
            {
                $group: { // Group by category name
                    _id: '$categoryDetails.name', // Use category name instead of ID
                    totalQuantity: { $sum: '$orderedItems.quantity' }, // Total products sold
                    totalRevenue: {
                        $sum: {
                            $multiply: [
                                { $toDouble: '$orderedItems.quantity' },
                                { $toDouble: '$orderedItems.price' }
                            ]
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort by quantity sold
            { $limit: 10 }, // Limit to top 10 categories
            {
                $project: {            
                    category: '$_id', // Use category name as the final field
                    totalQuantity: 1,
                    totalRevenue: 1,
                    _id: 0
                }
            }
        ]);
        



        // Render the sales report view with all the data
        res.render('salesReport', {
            totalOrders,
            totalUsers,
            totalProducts,
            totalSales,
            totalDiscount,
            orders,
            // topProductDetails,
            bestSellingProducts,
            topBrands,
            topCategories
        });
    } catch (error) {
        console.log("The error is", error);
    }
};






const dashboard = async (req, res) => {
    try {
        const { quickFilter, startDate, endDate } = req.body;
        let matchCondition = { status: "Delivered" };
        console.log("quickFilter : ",quickFilter);


         // Check if either startDate or endDate is missing  new added
         if (!startDate || !endDate) {
            if (!quickFilter || quickFilter === "none") {
                // If neither quickFilter nor dates are provided, inform the user
                return res.status(400).json({
                    message: "Please provide both startDate and endDate or select a valid quickFilter.",
                });
            }
        }

        if (startDate && endDate) {
            // Always filter by date range if both startDate and endDate are provided
            matchCondition.createdOn = {
                $gte: new Date(startDate),
                $lt: new Date(endDate),
            };
        } else if (quickFilter && quickFilter !== "none") {
            // Filter based on quickFilter if startDate and endDate are not provided
            const now = new Date();
            matchCondition.createdOn = {}; // Initialize `createdOn` filter

            switch (quickFilter) {
                case "today":
                    matchCondition.createdOn.$gte = moment(now).startOf("day").toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf("day").toDate();
                    break;
                case "week":
                    matchCondition.createdOn.$gte = moment(now).startOf("isoWeek").toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf("isoWeek").toDate();
                    break;
                case "month":
                    matchCondition.createdOn.$gte = moment(now).startOf("month").toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf("month").toDate();
                    break;
                case "year":
                    matchCondition.createdOn.$gte = moment(now).startOf("year").toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf("year").toDate();
                    break;
                default:
                    delete matchCondition.createdOn; // Remove `createdOn` filter if no match
                    break;
            }
        }

        // Fetch statistics
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments(matchCondition);

        // Aggregate total sales
        const Sales = await Order.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: null,
                    totalSales: {
                        $sum: {
                            $cond: [
                                { $eq: ["$discount", 0] },
                                "$totalPrice",
                                "$finalAmount",
                            ],
                        },
                    },
                },
            },
        ]);

        const totalSales = Sales.length > 0 ? Sales[0].totalSales : 0;

        // Fetch filtered orders
        const orders = await Order.find(matchCondition).sort({ createdOn: -1 });

        // Send response
        res.json({ totalOrders, totalUsers, totalProducts, totalSales, orders });
    } catch (error) {
        console.log("The error is", error);
        res.status(500).json({ message: "An error occurred while fetching dashboard data" });
    }
};







const generatePdfReport = async (req, res) => {
    try {
        const { quickFilter, startDate, endDate } = req.query;

        // Default match condition
        let matchCondition = { status: "Delivered" };

        // Apply filtering logic
        if (startDate && endDate) {
            // Filter by date range if both are provided
            matchCondition.createdOn = {
                $gte: new Date(startDate),
                $lt: new Date(endDate),
            };
        } else if (!startDate || !endDate) {
            if (quickFilter === "none") {
                // If quickFilter is "none" and either date is missing, don't filter and inform the user
                return res.status(400).json({
                    message: "Please provide both startDate and endDate or select a valid quickFilter.",
                });
            } else {
                // Apply quickFilter if it's not "none"
                const now = new Date();
                switch (quickFilter) {
                    case "today":
                        matchCondition.createdOn = {
                            $gte: moment(now).startOf("day").toDate(),
                            $lte: moment(now).endOf("day").toDate(),
                        };
                        break;
                    case "week":
                        matchCondition.createdOn = {
                            $gte: moment(now).startOf("isoWeek").toDate(),
                            $lte: moment(now).endOf("isoWeek").toDate(),
                        };
                        break;
                    case "month":
                        matchCondition.createdOn = {
                            $gte: moment(now).startOf("month").toDate(),
                            $lte: moment(now).endOf("month").toDate(),
                        };
                        break;
                    case "year":
                        matchCondition.createdOn = {
                            $gte: moment(now).startOf("year").toDate(),
                            $lte: moment(now).endOf("year").toDate(),
                        };
                        break;
                    default:
                        break;
                }
            }
        }

        // Fetch filtered orders
        const orders = await Order.find(matchCondition).sort({ createdOn: -1 });

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                message: "No orders found for the specified filters.",
            });
        }

        // Generate PDF
        const doc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=sales_report.pdf"
        );

        doc.pipe(res);

        // Title and setup
        doc.fontSize(25).text("Sales Report", { align: "center" });
        doc.moveDown();

        const columnWidths = {
            orderId: 170,
            date: 100,
            amount: 65,
            discount: 70,
            finalAmount: 80,
            status: 80,
        };

        // Table headers
        const tableHeaders = [
            "Order ID",
            "Date",
            "Amount",
            "Discount",
            "Final Amount",
            "Status",
        ];
        const headerY = doc.y;

        doc.fontSize(12).text(tableHeaders[0], 50, headerY, {
            width: columnWidths.orderId,
            align: "left",
        });
        doc.text(tableHeaders[1], 50 + columnWidths.orderId, headerY, {
            width: columnWidths.date,
            align: "left",
        });
        doc.text(
            tableHeaders[2],
            50 + columnWidths.orderId + columnWidths.date,
            headerY,
            { width: columnWidths.amount, align: "right" }
        );
        doc.text(
            tableHeaders[3],
            50 + columnWidths.orderId + columnWidths.date + columnWidths.amount,
            headerY,
            { width: columnWidths.discount, align: "right" }
        );
        doc.text(
            tableHeaders[4],
            50 +
                columnWidths.orderId +
                columnWidths.date +
                columnWidths.amount +
                columnWidths.discount,
            headerY,
            { width: columnWidths.finalAmount, align: "right" }
        );
        doc.text(
            tableHeaders[5],
            50 +
                columnWidths.orderId +
                columnWidths.date +
                columnWidths.amount +
                columnWidths.discount +
                columnWidths.finalAmount,
            headerY,
            { width: columnWidths.status, align: "center" }
        );
        doc.moveDown();

        // Table line
        doc.moveTo(50, headerY + 15).lineTo(600, headerY + 15).stroke();

        // Table content
        orders.forEach((order, index) => {
            const rowY = headerY + 30 + index * 20;

            doc.text(order._id, 50, rowY, {
                width: columnWidths.orderId,
                align: "left",
            });
            doc.text(
                new Date(order.createdOn).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }),
                50 + columnWidths.orderId,
                rowY,
                { width: columnWidths.date, align: "left" }
            );
            doc.text(
                `${order.totalPrice.toString()}`,
                50 + columnWidths.orderId + columnWidths.date,
                rowY,
                { width: columnWidths.amount, align: "right" }
            );
            doc.text(
                `${order.discount.toString()}`,
                50 +
                    columnWidths.orderId +
                    columnWidths.date +
                    columnWidths.amount,
                rowY,
                { width: columnWidths.discount, align: "right" }
            );
            doc.text(
                `${order.finalAmount || order.totalPrice.toString()}`,
                50 +
                    columnWidths.orderId +
                    columnWidths.date +
                    columnWidths.amount +
                    columnWidths.discount,
                rowY,
                { width: columnWidths.finalAmount, align: "right" }
            );
            doc.text(
                order.status,
                50 +
                    columnWidths.orderId +
                    columnWidths.date +
                    columnWidths.amount +
                    columnWidths.discount +
                    columnWidths.finalAmount,
                rowY,
                { width: columnWidths.status, align: "center" }
            );

            doc.moveTo(50, rowY + 10).lineTo(600, rowY + 10).stroke();
        });

        doc.end();
    } catch (error) {
        console.log("Error generating PDF:", error);
        res.status(500).json({ message: "Error generating PDF", error });
    }
};











const generateExcelReport = async (req, res) => {
    try {
        const { quickFilter, startDate, endDate } = req.query;

        let matchCondition = { status: "Delivered" };

        // Validate date range
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).send("Start date must be before end date.");
        }

        // Apply date range filters if both startDate and endDate are provided
        if (startDate && endDate) {
            matchCondition.createdOn = {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            };
        } else if (quickFilter && quickFilter !== 'none') {
            // Apply quick filter if provided
            const now = new Date();
            switch (quickFilter) {
                case 'today':
                    matchCondition.createdOn = {
                        $gte: moment(now).startOf('day').toDate(),
                        $lte: moment(now).endOf('day').toDate()
                    };
                    break;
                case 'week':
                    matchCondition.createdOn = {
                        $gte: moment(now).startOf('isoWeek').toDate(),
                        $lte: moment(now).endOf('isoWeek').toDate()
                    };
                    break;
                case 'month':
                    matchCondition.createdOn = {
                        $gte: moment(now).startOf('month').toDate(),
                        $lte: moment(now).endOf('month').toDate()
                    };
                    break;
                case 'year':
                    matchCondition.createdOn = {
                        $gte: moment(now).startOf('year').toDate(),
                        $lte: moment(now).endOf('year').toDate()
                    };
                    break;
                default:
                    break;
            }
        }

        // Fetch filtered orders from database
        const orders = await Order.find(matchCondition).sort({ createdOn: -1 });

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Set up columns
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'finalAmount', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        // Add rows for each order
        orders.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId,
                date: new Date(order.createdOn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                amount: order.totalPrice,
                discount: order.discount,
                finalAmount: order.finalAmount || order.totalPrice,
                status: order.status,
            });
        });

        // Set headers to force download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        // Write the workbook to the response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating Excel report:", error);
        res.status(500).send("Error generating report.");
    }
};














module.exports = {
   dashboard,
   loadDashboard,
   generatePdfReport,
   generateExcelReport,
}
























































































































































// generate pdf before review 
// const generatePdfReport = async (req, res) => {
//     try {
//         const { quickFilter, startDate, endDate } = req.query;

//         let matchCondition = { status: "Delivered" };

//         // Apply date range filters
//         if (startDate && endDate) {
//             matchCondition.createdOn = {
//                 $gte: new Date(startDate),
//                 $lt: new Date(endDate)
//             };
//         } else if (quickFilter) {
//             const now = new Date();
//             switch (quickFilter) {
//                 case 'today':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('day').toDate(),
//                         $lte: moment(now).endOf('day').toDate()
//                     };
//                     break;
//                 case 'week':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('isoWeek').toDate(),
//                         $lte: moment(now).endOf('isoWeek').toDate()
//                     };
//                     break;
//                 case 'month':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('month').toDate(),
//                         $lte: moment(now).endOf('month').toDate()
//                     };
//                     break;
//                 case 'year':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('year').toDate(),
//                         $lte: moment(now).endOf('year').toDate()
//                     };
//                     break;
//                 default:
//                     break;
//             }
//         }

//         // Fetch filtered orders
//         const orders = await Order.find(matchCondition).sort({createdOn:-1});

//         // Create document and Set response headers to indicate a PDF file download
//         const doc = new PDFDocument();
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

//         // Pipe the PDF stream to the response
//         doc.pipe(res);

//         // Add a title to the PDF
//         doc.fontSize(25).text('Sales Report', { align: 'center' });
//         doc.moveDown();

//         // Define column widths
//         const columnWidths = {
//             orderId: 170,
//             date: 100,
//             amount: 65,
//             discount: 70,
//             finalAmount: 80,
//             status: 80
//         };


       


//         // Draw table headers
//         const tableHeaders = ['Order ID', 'Date', 'Amount', 'Discount', 'Final Amount', 'Status'];
//         const headerY = doc.y;
//         doc.fontSize(12).text(tableHeaders[0], 50, headerY, { width: columnWidths.orderId, align: 'left' });
//         doc.text(tableHeaders[1], 50 + columnWidths.orderId, headerY, { width: columnWidths.date, align: 'left' });
//         doc.text(tableHeaders[2], 50 + columnWidths.orderId + columnWidths.date, headerY, { width: columnWidths.amount, align: 'right' });
//         doc.text(tableHeaders[3], 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount, headerY, { width: columnWidths.discount, align: 'right' });
//         doc.text(tableHeaders[4], 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount, headerY, { width: columnWidths.finalAmount, align: 'right' });
//         doc.text(tableHeaders[5], 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount + columnWidths.finalAmount, headerY, { width: columnWidths.status, align: 'center' });
//         doc.moveDown();

//         // Draw table lines (headers)
//         doc.moveTo(50, headerY + 15).lineTo(600, headerY + 15).stroke();

       

//         // Loop through each order and add its details to the table
//         orders.forEach((order, index) => {
           
//             const rowY = headerY + 30 + (index * 20);
        

//             // Ensure that the order ID doesn't overlap by wrapping text if it's too long
//             doc.text(order._id, 50, rowY, { width: columnWidths.orderId, align: 'left' });
//             doc.text(new Date(order.createdOn).toLocaleDateString('en-US',{ year: 'numeric', month: 'long', day: 'numeric' }), 50 + columnWidths.orderId, rowY, { width: columnWidths.date, align: 'left' });
//             doc.text(`${order.totalPrice.toString()}`, 50 + columnWidths.orderId + columnWidths.date, rowY, { width: columnWidths.amount, align: 'right' });
//             doc.text(`${order.discount.toString()}`, 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount, rowY, { width: columnWidths.discount, align: 'right' });
//             doc.text(`${order.finalAmount || order.totalPrice.toString()}`, 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount, rowY, { width: columnWidths.finalAmount, align: 'right' });
//             doc.text(order.status, 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount + columnWidths.finalAmount, rowY, { width: columnWidths.status, align: 'center' });
             
           
//             // Draw a line between rows
//             doc.moveTo(50, rowY + 10).lineTo(600, rowY + 10).stroke();
//         });


//         doc.end();
//     } catch (error) {
//         console.log("The error is", error);
//     }
// };



//generate excel before review 
// const generateExcelReport = async (req, res) => {
//     try {
//         const { quickFilter, startDate, endDate } = req.query;

//         let matchCondition = { status: "Delivered" };

//         // Apply date range filters
//         if (startDate && endDate) {
//             matchCondition.createdOn = {
//                 $gte: new Date(startDate),
//                 $lt: new Date(endDate)
//             };
//         } else if (quickFilter) {
//             const now = new Date();
//             switch (quickFilter) {
//                 case 'today':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('day').toDate(),
//                         $lte: moment(now).endOf('day').toDate()
//                     };
//                     break;
//                 case 'week':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('isoWeek').toDate(),
//                         $lte: moment(now).endOf('isoWeek').toDate()
//                     };
//                     break;
//                 case 'month':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('month').toDate(),
//                         $lte: moment(now).endOf('month').toDate()
//                     };
//                     break;
//                 case 'year':
//                     matchCondition.createdOn = {
//                         $gte: moment(now).startOf('year').toDate(),
//                         $lte: moment(now).endOf('year').toDate()
//                     };
//                     break;
//                 default:
//                     break;
//             }
//         }

//         // Fetch filtered orders
//         const orders = await Order.find(matchCondition).sort({createdOn:-1});

//         // Create a new Excel workbook and worksheet
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Sales Report');

//         // Set up columns
//         worksheet.columns = [
//             { header: 'Order ID', key: 'orderId', width: 25 },
//             { header: 'Date', key: 'date', width: 15 },
//             { header: 'Amount', key: 'amount', width: 15 },
//             { header: 'Discount', key: 'discount', width: 15 },
//             { header: 'Final Amount', key: 'finalAmount', width: 15 },
//             { header: 'Status', key: 'status', width: 15 },
//         ];

//         // Add rows for each order
//         orders.forEach(order => {
//             worksheet.addRow({
//                 orderId: order.orderId,
//                 date: new Date(order.createdOn).toLocaleDateString('en-US',{ year: 'numeric', month: 'long', day: 'numeric' }),
//                 amount: order.totalPrice,
//                 discount: order.discount,
//                 finalAmount: order.finalAmount || order.totalPrice,
//                 status: order.status,
//             });
//         });

//         // Set headers to force download
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

//         // Write the workbook to the response
//         await workbook.xlsx.write(res);
//         res.end();
//     } catch (error) {
//         console.error("Error generating Excel report:", error);
//         res.status(500).send("Error generating report.");
//     }
// };




//dashboard latest new 

// const dashboard = async (req, res) => {
//     try {
//         const { quickFilter, startDate, endDate } = req.body;
//         let matchCondition = { status: "Delivered" };
       
//         // console.log("quickFilter : ",quickFilter);
//         // console.log("startDate : ",startDate);
//         // console.log("endDate : ",endDate);


         
        
//         if (startDate && endDate) {
//             // If both startDate and endDate are provided, apply the date range filter
//             matchCondition.createdOn = {
//                 $gte: new Date(startDate),
//                 $lt: new Date(endDate)
//             };
//         } else if (quickFilter && quickFilter !== "none") {
//             // If quickFilter is provided and startDate/endDate are not, apply quickFilter
//             matchCondition.createdOn = {};
//             const now = new Date();
//             switch (quickFilter) {
//                 case 'today':
//                     matchCondition.createdOn.$gte = moment(now).startOf('day').toDate();
//                     matchCondition.createdOn.$lte = moment(now).endOf('day').toDate();
//                     break;
//                 case 'week':
//                     matchCondition.createdOn.$gte = moment(now).startOf('isoWeek').toDate();
//                     matchCondition.createdOn.$lte = moment(now).endOf('isoWeek').toDate();
//                     break;
//                 case 'month':
//                     matchCondition.createdOn.$gte = moment(now).startOf('month').toDate();
//                     matchCondition.createdOn.$lte = moment(now).endOf('month').toDate();
//                     break;
//                 case 'year':
//                     matchCondition.createdOn.$gte = moment(now).startOf('year').toDate();
//                     matchCondition.createdOn.$lt = moment(now).endOf('year').toDate();
//                     break;
//                 default:
//                     break;
//             }
//         }

//         let totalUsers = await User.countDocuments();
//         let totalProducts = await Product.countDocuments();
//         let totalOrders = await Order.countDocuments(matchCondition);

//         const Sales = await Order.aggregate([
//             { $match: matchCondition },                               //{ status: 'Delivered' }
//             { 
//                 $group: {
//                     _id: null,
//                     totalSales: { 
//                         $sum: { $cond: [{ $eq: ['$discount', 0] }, '$totalPrice', '$finalAmount'] }
//                     }
//                 }
//             }
//         ]);

//         const totalSales = Sales.length > 0 ? Sales[0].totalSales : 0;

//         const orders = await Order.find(matchCondition).sort({createdOn:-1});

//         res.json({ totalOrders, totalUsers, totalProducts, totalSales, orders });

//     } catch (error) {
//         console.log("The error is", error);
//     }
// };


