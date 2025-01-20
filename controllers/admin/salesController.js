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
        let totalUsers = await User.countDocuments();
        let totalProducts = await Product.countDocuments();
        let totalOrders = await Order.countDocuments();

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

        const discount = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { 
                $group: {
                    _id: null,
                    discount: { $sum: '$discount' }
                }
            }
        ]);

        const totalDiscount = discount.length > 0 ? discount[0].discount : 0;

        const orders = await Order.find({status:"Delivered"}).sort({createdOn:-1});

        res.render('salesReport', { totalOrders, totalUsers, totalProducts, totalSales, totalDiscount, orders });
    } catch (error) {
        console.log("The error is", error);
    }
};




const dashboard = async (req, res) => {
    try {
        const { quickFilter, startDate, endDate } = req.body;
        let matchCondition = { status: "Delivered" };
       
        // console.log("quickFilter : ",quickFilter);
        // console.log("startDate : ",startDate);
        // console.log("endDate : ",endDate);


         
        
        if (startDate && endDate) {
            // If both startDate and endDate are provided, apply the date range filter
            matchCondition.createdOn = {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            };
        } else if (quickFilter) {
            // If quickFilter is provided and startDate/endDate are not, apply quickFilter
            matchCondition.createdOn = {};
            const now = new Date();
            switch (quickFilter) {
                case 'today':
                    matchCondition.createdOn.$gte = moment(now).startOf('day').toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf('day').toDate();
                    break;
                case 'week':
                    matchCondition.createdOn.$gte = moment(now).startOf('isoWeek').toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf('isoWeek').toDate();
                    break;
                case 'month':
                    matchCondition.createdOn.$gte = moment(now).startOf('month').toDate();
                    matchCondition.createdOn.$lte = moment(now).endOf('month').toDate();
                    break;
                case 'year':
                    matchCondition.createdOn.$gte = moment(now).startOf('year').toDate();
                    matchCondition.createdOn.$lt = moment(now).endOf('year').toDate();
                    break;
                default:
                    break;
            }
        }

        let totalUsers = await User.countDocuments();
        let totalProducts = await Product.countDocuments();
        let totalOrders = await Order.countDocuments();

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

        const orders = await Order.find(matchCondition).sort({createdOn:-1});

        res.json({ totalOrders, totalUsers, totalProducts, totalSales, orders });

    } catch (error) {
        console.log("The error is", error);
    }
};






const generatePdfReport = async (req, res) => {
    try {
        const { quickFilter, startDate, endDate } = req.query;

        let matchCondition = { status: "Delivered" };

        // Apply date range filters
        if (startDate && endDate) {
            matchCondition.createdOn = {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            };
        } else if (quickFilter) {
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

        // Fetch filtered orders
        const orders = await Order.find(matchCondition).sort({createdOn:-1});

        // Create document and Set response headers to indicate a PDF file download
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        // Pipe the PDF stream to the response
        doc.pipe(res);

        // Add a title to the PDF
        doc.fontSize(25).text('Sales Report', { align: 'center' });
        doc.moveDown();

        // Define column widths
        const columnWidths = {
            orderId: 170,
            date: 100,
            amount: 65,
            discount: 70,
            finalAmount: 80,
            status: 80
        };


       


        // Draw table headers
        const tableHeaders = ['Order ID', 'Date', 'Amount', 'Discount', 'Final Amount', 'Status'];
        const headerY = doc.y;
        doc.fontSize(12).text(tableHeaders[0], 50, headerY, { width: columnWidths.orderId, align: 'left' });
        doc.text(tableHeaders[1], 50 + columnWidths.orderId, headerY, { width: columnWidths.date, align: 'left' });
        doc.text(tableHeaders[2], 50 + columnWidths.orderId + columnWidths.date, headerY, { width: columnWidths.amount, align: 'right' });
        doc.text(tableHeaders[3], 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount, headerY, { width: columnWidths.discount, align: 'right' });
        doc.text(tableHeaders[4], 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount, headerY, { width: columnWidths.finalAmount, align: 'right' });
        doc.text(tableHeaders[5], 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount + columnWidths.finalAmount, headerY, { width: columnWidths.status, align: 'center' });
        doc.moveDown();

        // Draw table lines (headers)
        doc.moveTo(50, headerY + 15).lineTo(600, headerY + 15).stroke();

        // Loop through each order and add its details to the table
        orders.forEach((order, index) => {
            const rowY = headerY + 30 + (index * 20);

            // Ensure that the order ID doesn't overlap by wrapping text if it's too long
            doc.text(order._id, 50, rowY, { width: columnWidths.orderId, align: 'left' });
            doc.text(new Date(order.createdOn).toLocaleDateString('en-US',{ year: 'numeric', month: 'long', day: 'numeric' }), 50 + columnWidths.orderId, rowY, { width: columnWidths.date, align: 'left' });
            doc.text(`₹${order.totalPrice}`, 50 + columnWidths.orderId + columnWidths.date, rowY, { width: columnWidths.amount, align: 'right' });
            doc.text(`₹${order.discount}`, 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount, rowY, { width: columnWidths.discount, align: 'right' });
            doc.text(`₹${order.finalAmount || order.totalPrice}`, 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount, rowY, { width: columnWidths.finalAmount, align: 'right' });
            doc.text(order.status, 50 + columnWidths.orderId + columnWidths.date + columnWidths.amount + columnWidths.discount + columnWidths.finalAmount, rowY, { width: columnWidths.status, align: 'center' });

            // Draw a line between rows
            doc.moveTo(50, rowY + 10).lineTo(600, rowY + 10).stroke();
        });

        doc.end();
    } catch (error) {
        console.log("The error is", error);
    }
};






const generateExcelReport = async (req, res) => {
    try {
        const { quickFilter, startDate, endDate } = req.query;

        let matchCondition = { status: "Delivered" };

        // Apply date range filters
        if (startDate && endDate) {
            matchCondition.createdOn = {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            };
        } else if (quickFilter) {
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

        // Fetch filtered orders
        const orders = await Order.find(matchCondition).sort({createdOn:-1});

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
                date: new Date(order.createdOn).toLocaleDateString('en-US',{ year: 'numeric', month: 'long', day: 'numeric' }),
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


























































































// const Order = require('../../models/orderSchema');
// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const User = require('../../models/userSchema');
// const mongoose = require('mongoose');


// const getSalesReport = async (req, res) => {
//     res.render("salesReport");
// };



// const generateSalesReport = async (req, res) => {
//     const { startDate, endDate, reportType } = req.body;
//     const start = moment(startDate).startOf('day').toDate();
//     const end = moment(endDate).endOf('day').toDate();

//     try {
//         const orders = await Order.find({ invoiceDate: { $gte: start, $lte: end } });

//         let totalSales = 0;
//         let totalDiscount = 0;
//         let totalOrders = orders.length;
//         let totalFinalAmount = 0;

//         orders.forEach(order => {
//             totalSales += order.totalPrice;
//             totalDiscount += order.discount;
//             totalFinalAmount += order.finalAmount;
//         });


      


//         if (reportType === 'pdf') {
//             generatePDFReport(orders, totalSales, totalDiscount, totalFinalAmount, res);
//         } else if (reportType === 'excel') {
//             generateExcelReport(orders, totalSales, totalDiscount, totalFinalAmount, res);
//         } else {
//             res.status(400).json({ message: 'Invalid report type.' });
//         }


//             // Send a JSON response before generating the file for PDF/Excel reports
//             res.status(200).json({
//                 success: true,
//                 report: {
//                     totalOrders: totalOrders,
//                     totalSales: totalSales.toFixed(2),
//                     totalDiscount: totalDiscount.toFixed(2)
//                 }
//             });
    

       
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Failed to generate report.' });
//     }
// };














// function generatePDFReport(orders, totalSales, totalDiscount, totalFinalAmount, res) {
//     const doc = new pdf();
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=Sales_Report.pdf');
//     doc.pipe(res);

//     doc.text('Sales Report', { align: 'center' });
//     doc.text(`Total Orders: ${orders.length}`);
//     doc.text(`Total Sales: ${totalSales.toFixed(2)}`);
//     doc.text(`Total Discount: ${totalDiscount.toFixed(2)}`);
//     doc.text(`Total Final Amount: ${totalFinalAmount.toFixed(2)}`);
//     doc.text('Orders Detail:', { underline: true });

//     orders.forEach(order => {
//         doc.text(`Order ID: ${order.orderId}, Total Price: ${order.totalPrice.toFixed(2)}, Final Amount: ${order.finalAmount.toFixed(2)}`);
//     });

//     doc.end();
// }

// function generateExcelReport(orders, totalSales, totalDiscount, totalFinalAmount, res) {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Sales Report');

//     worksheet.columns = [
//         { header: 'Order ID', key: 'orderId', width: 30 },
//         { header: 'Total Price', key: 'totalPrice', width: 15 },
//         { header: 'Discount', key: 'discount', width: 15 },
//         { header: 'Final Amount', key: 'finalAmount', width: 15 }
//     ];

//     orders.forEach(order => {
//         worksheet.addRow({
//             orderId: order.orderId,
//             totalPrice: order.totalPrice.toFixed(2),
//             discount: order.discount.toFixed(2),
//             finalAmount: order.finalAmount.toFixed(2)
//         });
//     });

//     worksheet.addRow([]);
//     worksheet.addRow(['Total Sales', totalSales.toFixed(2)]);
//     worksheet.addRow(['Total Discount', totalDiscount.toFixed(2)]);
//     worksheet.addRow(['Total Final Amount', totalFinalAmount.toFixed(2)]);

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=Sales_Report.xlsx');

//     workbook.xlsx.write(res).then(() => res.end());
// }






// module.exports = {
//     getSalesReport,
// }