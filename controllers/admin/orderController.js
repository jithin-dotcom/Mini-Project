const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');




const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page query
    const pageSize = 10; // Number of orders per page
    const skip = (page - 1) * pageSize; // Calculate how many records to skip

    // Fetch orders with pagination and sorting by createdOn (newest first)
    const orders = await Order.find()
      .populate("userId", "name")
      .populate("address", "fullAddress")
      .skip(skip)
      .limit(pageSize)
      .sort({ createdOn: -1 }) // Sort by 'createdOn' in descending order (newest first)
      .exec();

      // console.log("orders : ",orders);
    // Fetch the total count of orders for pagination calculations
    const totalOrders = await Order.countDocuments();

    const totalPages = Math.ceil(totalOrders / pageSize); // Calculate total pages

    // Map data to match the EJS table structure
    const formattedOrders = orders.map(order => ({
      id: order.orderId,
      customer: order.userId?.name || "N/A",
      address: order.address ? order.address.fullAddress : "N/A",
      date: order.createdOn ? order.createdOn.toDateString() : "N/A",
      total: order.finalAmount.toFixed(2),
      status: order.status,
    }));

    // Render the order page with pagination info
    res.render("order", {
      pageTitle: "Order List",
      orders: formattedOrders,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};













// const getAllOrders = async (req, res) => {


//     try {
//         const orders = await Order.find()
//           .populate("userId", "name") // Assuming the User schema has a 'name' field.
//           .populate("address", "fullAddress") // Assuming Address schema has 'fullAddress'.
//           .exec();
    
//          console.log("Orders:", orders);

//         // Map data to match the EJS table structure
//         // const formattedOrders = orders.map(order => ({
//         //   id: order.orderId,
//         //   customer: order.userId?.name || "N/A", // Default to 'N/A' if userId is null
//         //   date: order.invoiceDate ? order.invoiceDate.toDateString() : "N/A",
//         //   total: order.finalAmount.toFixed(2), // Format to 2 decimal places
//         //   status: order.status,
          
//         // }));

//         const formattedOrders = orders.map(order => ({
//             id: order.orderId,
//             customer: order.userId?.name || "N/A", // If userId is null or missing, show "N/A"
//             address: order.address ? order.address.fullAddress : "N/A", // Check if address exists
//             date: order.createdOn ? order.createdOn.toDateString() : "N/A",
//             total: order.finalAmount.toFixed(2),
//             status: order.status,
//           }));




//         console.log("Formatted Orders:", formattedOrders);
    
//         res.render("order", { pageTitle: "Order List", orders: formattedOrders });
//       } catch (error) {
//         console.error("Error fetching orders:", error);
//         res.status(500).send("Internal Server Error");
//       }
// }









const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;

    // Find the order and populate product details
    const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');
    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Find the user's wallet
    const wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      return res.status(404).send('Wallet not found');
    }

    // Logic for handling wallet balance cancelled orders
    if (order.status !== 'Cancelled' && order.status !== 'Returned' && newStatus === 'Cancelled' && order.paymentMethod !== 'cashOnDelivery') {
      // Increment wallet balance when order is cancelled and payment method is not COD
      wallet.balance += order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'refund',
        transactionAmount: order.finalAmount,
        description: `Refund for cancelled order ${orderId}`
      });
    } else if (order.status === 'Cancelled' && ['Pending', 'Shipped', 'Delivered'].includes(newStatus)) {
      // Decrement wallet balance when order status changes from Cancelled back to Pending/Shipped/Delivered
      wallet.balance -= order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'debit',
        transactionAmount: order.finalAmount,
        description: `Debit for reactivated order from canceling ${orderId}`
      });
    }

      // Logic for handling wallet balance  returned orders
      if (order.status !== 'Cancelled' && order.status !== 'Returned' && newStatus === 'Returned' && order.paymentMethod !== 'cashOnDelivery') {
        // Increment wallet balance when order is cancelled and payment method is not COD
        wallet.balance += order.finalAmount;
        wallet.transactionHistory.push({
          transactionType: 'refund',
          transactionAmount: order.finalAmount,
          description: `Refund for Returned order ${orderId}`
        });
      } else if (order.status === 'Returned' && ['Pending', 'Shipped', 'Delivered'].includes(newStatus)) {
        // Decrement wallet balance when order status changes from Cancelled back to Pending/Shipped/Delivered
        wallet.balance -= order.finalAmount;
        wallet.transactionHistory.push({
          transactionType: 'debit',
          transactionAmount: order.finalAmount,
          description: `Debit for reactivated order from returning ${orderId}`
        });
      }

    // Save wallet changes
    await wallet.save();

    // Iterate over orderedItems to update product stock if necessary
    for (const item of order.orderedItems) {
      const product = item.product;

      if (!product) continue;

      const size = item.size;
      const quantity = item.quantity;

      // Only update stock if status is changing between the relevant statuses
      if ((order.status === 'Pending' || order.status === 'Shipped' || order.status === 'Delivered') && newStatus === 'Cancelled') {
        // Increase stock when status changes from Pending/Delivered/Shipped to Cancelled
        product.size.set(size, (product.size.get(size) || 0) + quantity);
      } else if (order.status === 'Cancelled' && (newStatus === 'Pending' || newStatus === 'Shipped' || newStatus === 'Delivered')) {
        // Decrease stock when status changes from Cancelled to Pending/Delivered/Shipped
        product.size.set(size, (product.size.get(size) || 0) - quantity);
      }

      await product.save();
    }

    // Update order status only after handling stock and wallet changes
    order.status = newStatus;
    await order.save();

    // Redirect back to the orders page
    res.redirect('/admin/orderList');
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).send('Internal Server Error');
  }
};

















//update order new

// const updateOrderStatus = async (req, res) => {
//   try {
//     const orderId = req.params.id;
//     const newStatus = req.body.status;

//     // Find the order and populate product details
//     const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');
//     if (!order) {
//       return res.status(404).send('Order not found');
//     }

//     // console.log("Current Status:", order.status);
//     // console.log("New Status:", newStatus);
//     // console.log("Order:", order);


//     //  // Prevent status change if order is already "Delivered"
//     //  if (order.status === 'Delivered') {
//     //   return res.status(400).send('Order has already been delivered and cannot be updated.');
//     // }



//     // Iterate over orderedItems to update product stock if necessary
//     for (const item of order.orderedItems) {
//       const product = item.product;

//       if (!product) continue;

//       const size = item.size;
//       const quantity = item.quantity;

//       // Only update stock if status is changing between the relevant statuses
//       if ((order.status === 'Pending' || order.status === 'Shipped' || order.status === 'Delivered') && newStatus === 'Cancelled') {
//         // Increase stock when status changes from Pending/Delivered/Shipped to Cancelled
//         product.size.set(size, (product.size.get(size) || 0) + quantity);
//       } else if (order.status === 'Cancelled' && (newStatus === 'Pending' || newStatus === 'Shipped' || newStatus === 'Delivered')) {
//         // Decrease stock when status changes from Cancelled to Pending/Delivered/Shipped
//         product.size.set(size, (product.size.get(size) || 0) - quantity);
//       }

//       await product.save();
//     }

//     // Update order status only after handling stock changes
//     order.status = newStatus;
//     await order.save();

//     // Redirect back to the orders page
//     res.redirect('/admin/orderList');
//   } catch (error) {
//     console.error('Error updating order status:', error);
//     res.status(500).send('Internal Server Error');
//   }
// };









// const updateOrderStatus = async (req, res) => {
//   try {
//       const orderId = req.params.id;
//       const newStatus = req.body.status;

//       // Find the order and populate product details
//       const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');
//       if (!order) {
//           return res.status(404).send('Order not found');
//       }

//       console.log("Status:", newStatus);
//       console.log("Order:", order);

//       // Iterate over orderedItems to update product stock
//       for (const item of order.orderedItems) {
//           const product = item.product;

//           if (!product) continue;

//           const size = item.size;
//           const quantity = item.quantity;

//           // Adjust stock based on new status
//           if (newStatus === 'Pending') {
//               // Reduce stock for 'Pending/Delevered/Shipped' status
//               product.size.set(size, (product.size.get(size) || 0) - quantity);
//           } else if (newStatus === 'Cancelled') {
//               // Increase stock for 'Cancelled' status
//               product.size.set(size, (product.size.get(size) || 0) + quantity);
//           }



//           //   // Store the stock value for pending state
//           //   if (newStatus === 'Pending') {
//           //     product.size.set(size, (product.size.get(size) || 0) - quantity);
//           // } else if (newStatus === 'Delivered' || newStatus === 'Shipped') {
//           //     // Set stock the same as 'Pending'
//           //     product.size.set(size, (product.size.get(size) || 0) - quantity);
//           // } else if (newStatus === 'Cancelled') {
//           //     // Revert stock increase for 'Cancelled' status
//           //     product.size.set(size, (product.size.get(size) || 0) + quantity);
//           // }

//           await product.save();
//       }

//       // Update order status
//       order.status = newStatus;
//       await order.save();

//       // Redirect back to the orders page
//       res.redirect('/admin/orderList');
//   } catch (error) {
//       console.error('Error updating order status:', error);
//       res.status(500).send('Internal Server Error');
//   }
// };






// const updateOrderStatus = async (req, res) => {
//   try {
//       const orderId = req.params.id;
//       const newStatus = req.body.status;

//       // Find the order
//       const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');
//       if (!order) {
//           return res.status(404).send('Order not found');
//       }

//       console.log("Status:", newStatus);
//       console.log("Order:", order);

//       // Iterate over orderedItems to update product stock
//       for (const item of order.orderedItems) {
//           const product = item.product;

//           if (!product) continue;

//           const size = item.size;
//           const quantity = item.quantity;

//           // Adjust stock based on new and previous status
//           if (newStatus === 'Cancelled' || newStatus === 'Pending') {
//               product.size.set(size, (product.size.get(size) || 0) + quantity);
//           } else if (order.status === 'Cancelled' || order.status === 'Pending') {
//               product.size.set(size, (product.size.get(size) || 0) - quantity);
//           }

//           await product.save();
//       }

//       // Update order status
//       order.status = newStatus;
//       await order.save();

//       // Redirect back to the orders page
//       res.redirect('/admin/orderList');
//   } catch (error) {
//       console.error('Error updating order status:', error);
//       res.status(500).send('Internal Server Error');
//   }
// };







// const updateOrderStatus = async (req, res) => {
//   try {
//       const orderId = req.params.id;
//       const newStatus = req.body.status;

//       // Find and update the order status
//       const order = await Order.findOne({ orderId: orderId });
//       if (!order) {
//           return res.status(404).send('Order not found');
//       }

//       // Check if status change affects the stock
//       if ((order.status === 'Cancelled' || order.status === 'Pending') && newStatus !== order.status) {
//           for (const item of order.items) {
//               const product = await Product.findById(item.productId);
//               if (!product) continue;

//               const size = item.size; // Assuming `size` is part of each order item
//               const quantity = item.quantity;

//               // Update stock based on the status change
//               if (newStatus === 'Cancelled' || newStatus === 'Pending') {
//                   product.size.set(size, (product.size.get(size) || 0) + quantity);
//               } else if (order.status === 'Cancelled' || order.status === 'Pending') {
//                   product.size.set(size, (product.size.get(size) || 0) - quantity);
//               }

//               await product.save();
//           }
//       }

//       console.log("Status:", newStatus);
//       console.log("Order:", order);
//       order.status = newStatus; // Set the new status

//       // Save the updated order
//       await order.save();

//       // Redirect back to the orders page
//       res.redirect('/admin/orderList');
//   } catch (error) {
//       console.error('Error updating order status:', error);
//       res.status(500).send('Internal Server Error');
//   }
// };






// const updateOrderStatus = async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const newStatus = req.body.status;
    
//         // Find and update the order status
//         const order = await Order.findOne({orderId: orderId})
//         if (!order) {
//           return res.status(404).send('Order not found');
//         }
         
//         console.log("Status:", newStatus);
//         console.log("Order:", order);
//         order.status = newStatus; // Set the new status
    
//         // Save the updated order
//         await order.save();
    
//         // Redirect back to the orders page
//         res.redirect('/admin/orderList');
//       } catch (error) {
//         console.error('Error updating order status:', error);
//         res.status(500).send('Internal Server Error');
//       }
// }


// const cancelOrder = async (req, res) => {
   
//     try {
//         const orderId = req.params.id;
//         // const newStatus = req.body.status;
    
//         // Find and update the order status
//         const order = await Order.findOne({orderId: orderId})
//         if (!order) {
//           return res.status(404).send('Order not found');
//         }
       
        
//         // Check if the order is already cancelled
//         if (order.status === 'Cancelled') {
//             return res.status(400).json({ status: false, message: "Order is already cancelled." });
//         }

//         // Update the order status to 'Cancelled'
//         order.status = 'Cancelled';
//         order.cancellationReason = req.body.cancellationReason || "Admin cancelled"; // Optional reason
//         await order.save();

//         // Adjust the stock for each item in the order
//         for (const item of order.items) {
//             const product = await Product.findById(item.productId);
//             if (product) {
//                 const sizeStock = product.sizes.find(size => size.size === item.size);
//                 if (sizeStock) {
//                     sizeStock.stock += item.quantity;
//                 }
//             }
//             await product.save();
//         }

//         // Redirect or respond with success
//         res.redirect('/admin/orderList');
//     } catch (error) {
//         console.error('Error cancelling the order:', error);

//         res.status(500).json({
//             status: false,
//             message: 'An error occurred while cancelling the order.'
//         });
//     }
       
// }



// cancel order new 

// const cancelOrder = async (req, res) => {
//     try {
//         const orderId = req.params.id;

//         // Find the order by ID
//         const order = await Order.findOne({ orderId: orderId });
//         if (!order) {
//             return res.status(404).send('Order not found');
//         }

//         // Check if the order is already cancelled
//         if (order.status === 'Cancelled') {
//             return res.status(400).json({ status: false, message: "Order is already cancelled." });
//         }

//         // Update the order status to 'Cancelled'
//         order.status = 'Cancelled';
//         order.cancellationReason = req.body.cancellationReason || "Admin cancelled"; // Optional reason
//         await order.save();

//         // Adjust the stock for each item in the order
//         for (const item of order.orderedItems) {
//             const product = await Product.findById(item.product);
//             if (product) {
//                 const currentStock = product.size.get(item.size);
//                 if (currentStock !== undefined) {
//                     product.size.set(item.size, currentStock + item.quantity);
//                 }
//                 await product.save();
//             }
//         }

//         // Redirect or respond with success
//         res.redirect('/admin/orderList');
//     } catch (error) {
//         console.error('Error cancelling the order:', error);

//         res.status(500).json({
//             status: false,
//             message: 'An error occurred while cancelling the order.'
//         });
//     }
// };







const cancelOrder = async (req, res) => {
  try {
      const orderId = req.params.id;

      // Find the order by ID
      const order = await Order.findOne({ orderId: orderId });
      if (!order) {
          return res.status(404).send('Order not found');
      }

      // Check if the order is already cancelled
      if (order.status === 'Cancelled') {
          return res.status(400).json({ status: false, message: "Order is already cancelled." });
      }

      // Update the order status to 'Cancelled'
      order.status = 'Cancelled';
      order.cancellationReason = req.body.cancellationReason || "Admin cancelled"; // Optional reason
      await order.save();

      // Adjust the stock for each item in the order
      for (const item of order.orderedItems) {
          const product = await Product.findById(item.product);
          if (product) {
              const currentStock = product.size.get(item.size);
              if (currentStock !== undefined) {
                  product.size.set(item.size, currentStock + item.quantity);
              }
              await product.save();
          }
      }

      // Refund logic for non-COD payment methods
      if (order.paymentMethod !== 'COD') {
          const userId = order.userId;
          let wallet = await Wallet.findOne({ userId });

          // Create a new wallet if it doesn't exist
          if (!wallet) {
              wallet = new Wallet({ userId, balance: 0, transactionHistory: [] });
          }

          // Add the refunded amount to the wallet balance
          wallet.balance += order.finalAmount;

          // Add transaction history entry
          wallet.transactionHistory.push({
              transactionType: 'credit',
              transactionAmount: order.finalAmount,
              description: `Refund for cancelled order ${order.orderId}`
          });

          await wallet.save();
      }

      // Redirect or respond with success
      res.redirect('/admin/orderList');
  } catch (error) {
      console.error('Error cancelling the order:', error);

      res.status(500).json({
          status: false,
          message: 'An error occurred while cancelling the order.'
      });
  }
};









const deleteOrder = async (req, res) => {
    try {
      const orderId = req.params.id;
  
      // Find and delete the order by its ID
      const order = await Order.findOneAndDelete({ orderId: orderId });
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      console.log("Deleted Order:", order);
  
      // Redirect back to the orders page after deletion
      res.redirect('/admin/orderList');
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  




//   const viewOrderDetails = async (req, res) => {
//     try {
//         const orderId = req.params.id;
        
//         // Fetch the order and populate the address field
//         const order = await Order.findOne({ orderId })
//             .populate('orderedItems.product') // Populate product details if needed
//             .populate('userId') // Populate user details if needed
//             .populate({
//                 path: 'address', 
//                 select: 'addressType name city state landMark pincode phone altPhone' // Select relevant fields
//             })
//             .exec();

//         if (!order) {
//             return res.status(404).send('Order not found');
//         }

//         // Check if the address array exists and has at least one address
//         const address = order.address && order.address.length > 0 ? order.address[0] : null;

//         if (!address) {
//             return res.status(404).send('Address not found for this order');
//         }

//         // Render the view with the order and first address
//         res.render('viewOrder', {
//             order,
//             address
//         });

//     } catch (error) {
//         console.error("Error fetching order details:", error);
//         res.status(500).send('Internal Server Error');
//     }
// };




//   const viewOrderDetails = async (req, res) => {
//     try {
//         const { orderId } = req.params;

//         // Fetch the order details along with the user and address
//         const order = await Order.findOne({ orderId })
//             .populate('userId')
//             .populate('address') // Assumes address is a reference to the Address model
//             .exec();

//         if (!order) {
//             return res.status(404).send('Order not found');
//         }

//         // Check if the address exists
//         if (!order.address || order.address.length === 0) {
//             return res.status(404).send('Address not found for this order');
//         }

//         // Get the address details (assumes it's an array, take the first address)
//         const address = order.address[0]; // Safely access the address

//         // Render the order details view
//         res.render('viewOrder', { order, address });
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.status(500).send('Server error');
//     }
// };









//   const viewOrderDetails = async (req, res) => {
//     try {
//         const { orderId } = req.params;

//         // Fetch the order details along with the user and address
//         const order = await Order.findOne({ orderId })
//             .populate('userId')
//             .populate('address') // Assumes address is a reference to the Address model
//             .exec();

//         if (!order) {
//             return res.status(404).send('Order not found');
//         }

//         // Get the address details (assumes it's an array, take the first address)
//         const address = order.address[0];

//         // Render the order details view
//         res.render('viewOrder', { order, address });
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.status(500).send('Server error');
//     }
// };






//   const getOrderDetails = async(req,res)=>{

//     try {
//         const orderId = req.params.id;
//         const userId = req.session.user._id;
//         const order = await Order.findById(orderId);
//         //  // Find the order by ID and populate the address field
//         //  const order = await Order.findById(orderId).populate('address');
//         console.log("order : ",order);
//         if (!order) {
//             return res.status(404).render('error', { message: 'Order not found' });
//         }

//           // Find the user's address document
//           const addressDoc = await Address.findOne({ userId }).exec();
//           // Find the specific address object in the address array
//         const address = addressDoc.address.find(addr => addr._id.equals(order.address));
//         console.log("address : ",address); 

//         if (!address) {
//             return res.status(404).send("Order address not found");
//         }


//         res.render('viewOrder', { order,address });
//     } catch (error) {
//         console.error(error);
//         res.status(500).render('error', { message: 'Internal Server Error' });
//     }


// }










//   const getOrderDetails = async (req, res) => {
  
//     try {
//         const orderId = req.params.id;
//         const userId = req.session.user._id;
//         // console.log("userID:", userId);
//         const order = await Order.findOne({ orderId }).populate('orderedItems.product').exec();
        
//        // Find the user's address document
//         const addressDoc = await Address.findOne({ userId }).exec();
//         //  const addressDoc = await Address.findOne({ addressId }).exec();

//         if (!addressDoc) {
//             return res.status(404).send("Address not found");
//         }

//         // Find the specific address object in the address array
//         const address = addressDoc.address.find(addr => addr._id.equals(order.address));
//         console.log("address : ",address); 

//         if (!address) {
//             return res.status(404).send("Order address not found");
//         }

     
//         if (!order) {
//             return res.status(404).send("Order not found");
//         }

//         res.render('orderDetails', { order , address}); // render EJS page with order details
//     } catch (err) {
//         console.error("Error fetching order details:", err);
//         res.status(500).send("Error fetching order details");
//     }
// }








//   const getOrderDetails = async (req, res) => {
//     try {
//         const orderId = req.params.id;

//         // Fetch the order details from the database using the 'orderId' field
//         // const order = await Order.findOne({ orderId }).populate('userId').exec();

//          // Fetch the order details from the database using 'orderId' and populate 'userId' and 'address'
//          const order = await Order.findOne({ orderId })
//          .populate('userId')  // Populating the userId field
//          .populate('address')  // Populating the address field
//          .exec();


//         if (!order) {
//             return res.status(404).render('error', { message: 'Order not found.' });
//         }

//         // Render the order details page
//         res.render('orderDetails', { order });
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.status(500).render('error', { message: 'Server error while fetching order details.' });
//     }
// };












//   const getOrderDetails = async (req, res) => {
//     try {
//         const orderId = req.params.id;

//         // Fetch the order details from the database
//         const order = await Order.findById(orderId).populate('userId').exec();

//         if (!order) {
//             return res.status(404).render('error', { message: 'Order not found.' });
//         }

//         // Render the order details page
//         res.render('orderDetails', { order });
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.status(500).render('error', { message: 'Server error while fetching order details.' });
//     }
// };





const seeOrders = async(req,res)=>{

  try {
      const orderId = req.params.id;
       
      const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');

      // console.log("order : ",order);

      if (!order) {
          return res.status(404).render('error', { message: 'Order not found' });
      }

      const userId = order.userId;

       // Find the user's address document
      const addressDoc = await Address.findOne({ userId }).exec();

      // Find the specific address object in the address array
      const address = addressDoc.address.find(addr => addr._id.equals(order.address));

      // console.log("address : ",address); 

      if (!address) {
          return res.status(404).send("Order address not found");
      }


      res.render('seeOrder', { order,address });
  } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: 'Internal Server Error' });
  }


}










module.exports = {
    getAllOrders,
    updateOrderStatus,
    cancelOrder,
    deleteOrder,
    seeOrders,
    
}
