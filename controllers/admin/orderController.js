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
    if (order.status !== 'Cancelled'  && newStatus === 'Cancelled' && order.paymentMethod !== 'cashOnDelivery') {
      // Increment wallet balance when order is cancelled and payment method is not COD
      wallet.balance += order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'refund',
        transactionAmount: order.finalAmount,
        description: `Refund for cancelled order ${orderId}`
      });
    } else if (order.status === 'Cancelled' && ['Pending', 'Shipped', 'Delivered'].includes(newStatus)&& order.paymentMethod !== 'cashOnDelivery') {
      // Decrement wallet balance when order status changes from Cancelled back to Pending/Shipped/Delivered
      wallet.balance -= order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'debit',
        transactionAmount: order.finalAmount,
        description: `Debit for reactivated order from canceling ${orderId}`
      });
    }

      // Logic for handling wallet balance  returned orders
      // if (order.status !== 'Cancelled' && order.status !== 'Returned' && newStatus === 'Returned' && order.paymentMethod !== 'cashOnDelivery') {
      //   // Increment wallet balance when order is cancelled and payment method is not COD
      //   wallet.balance += order.finalAmount;
      //   wallet.transactionHistory.push({
      //     transactionType: 'refund',
      //     transactionAmount: order.finalAmount,
      //     description: `Refund for Returned order ${orderId}`
      //   });
      // } else if (order.status === 'Returned' && ['Pending', 'Shipped', 'Delivered'].includes(newStatus)&& order.paymentMethod !== 'cashOnDelivery') {
      //   // Decrement wallet balance when order status changes from Cancelled back to Pending/Shipped/Delivered
      //   wallet.balance -= order.finalAmount;
      //   wallet.transactionHistory.push({
      //     transactionType: 'debit',
      //     transactionAmount: order.finalAmount,
      //     description: `Debit for reactivated order from returning ${orderId}`
      //   });
      // }

      //new code
      if (order.status === 'Delivered' && newStatus === 'Returned' ) {
        // Increment wallet balance when order is cancelled and payment method is not COD     && order.paymentMethod==='cashOnDelivery'
        wallet.balance += order.finalAmount;
        wallet.transactionHistory.push({
          transactionType: 'refund',
          transactionAmount: order.finalAmount,
          description: `Refund for Returned order ${orderId}`
        });
      }


        // Update payment status and method when the order is delivered
    if (newStatus === 'Delivered' && order.paymentStatus === 'notCompleted') {
      order.paymentStatus = 'completed';
      order.paymentMethod = 'cashOnDelivery';
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
