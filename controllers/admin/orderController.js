import Order from '../../models/orderSchema.js';
import Address from '../../models/addressSchema.js';
import Product from '../../models/productSchema.js';
import User from '../../models/userSchema.js';
import Wallet from '../../models/walletSchema.js';




const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const pageSize = 10; 
    const skip = (page - 1) * pageSize; 
    

    const [orders,totalOrders] = await Promise.all([
      Order.find()
         .populate("userId","name")
         .populate("address","fullAddress")
         .skip(skip)
         .limit(pageSize)
         .sort({createdOn:-1})
         .exec(),
      Order.countDocuments()
      
  ]);
    const totalPages = Math.ceil(totalOrders / pageSize); 
    const formattedOrders = orders.map(order => ({
      id: order.orderId,
      customer: order.userId?.name || "N/A",
      address: order.address ? order.address.fullAddress : "N/A",
      date: order.createdOn ? order.createdOn.toDateString() : "N/A",
      total: order.finalAmount.toFixed(2),
      status: order.status,
    }));
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






const getOrdersData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const [orders, totalOrders] = await Promise.all([
      Order.find()
        .populate("userId", "name")
        .populate("address", "fullAddress")
        .skip(skip)
        .limit(pageSize)
        .sort({ createdOn: -1 })
        .exec(),
      Order.countDocuments()
    ]);

    const totalPages = Math.ceil(totalOrders / pageSize);
    const formattedOrders = orders.map(order => ({
      id: order.orderId,
      customer: order.userId?.name || "N/A",
      address: order.address ? order.address.fullAddress : "N/A",
      date: order.createdOn ? order.createdOn.toDateString() : "N/A",
      total: order.finalAmount.toFixed(2),
      status: order.status,
    }));

    res.json({
      status: true,
      orders: formattedOrders,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error("Error fetching orders for AJAX:", error);
    res.status(500).json({ status: false, message: "Error fetching orders" });
  }
};




const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;
    const order = await Order.findOne({ orderId: orderId }).populate('orderedItems.product');
    if (!order) {
      return res.status(404).json({ status: false, message: 'Order not found', currentStatus: order.status });
    }
    const wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      return res.status(404).json({ status: false, message: 'Wallet not found', currentStatus: order.status });
    }
    if (order.status !== 'Cancelled' && newStatus === 'Cancelled' && order.paymentMethod !== 'cashOnDelivery' && order.paymentStatus !== "notCompleted") {
      wallet.balance += order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'credit',
        transactionAmount: order.finalAmount,
        description: `Refund for cancelled order ${orderId}`
      });
    } else if (order.status === 'Cancelled' && ['Pending', 'Shipped', 'Delivered'].includes(newStatus) && order.paymentMethod !== 'cashOnDelivery') {
      if (wallet.balance < order.finalAmount) {
        return res.status(400).json({ status: false, message: 'Insufficient wallet balance to reactivate order', currentStatus: order.status });
      }
      wallet.balance -= order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'debit',
        transactionAmount: order.finalAmount,
        description: `Debit for reactivated order from canceling ${orderId}`
      });
    } else if (order.status !== 'Cancelled' && newStatus === 'Cancelled' && order.paymentMethod !== 'cashOnDelivery' && order.paymentStatus === "notCompleted") {
      order.paymentStatus = "completed";
    }

    if (order.status === 'Delivered' && newStatus === 'Returned') {
      wallet.balance += order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: 'credit',
        transactionAmount: order.finalAmount,
        description: `Refund for Returned order ${orderId}`
      });
    }
    if (newStatus === 'Delivered' && order.paymentStatus === 'notCompleted') {
      order.paymentStatus = 'completed';
      order.paymentMethod = 'cashOnDelivery';
    }

    await wallet.save();

    for (const item of order.orderedItems) {
      const product = item.product;
      if (!product) continue;

      const size = item.size;
      const quantity = item.quantity;

      if ((order.status === 'Pending' || order.status === 'Shipped' || order.status === 'Delivered') && newStatus === 'Cancelled') {
        product.size.set(size, (product.size.get(size) || 0) + quantity);
      } else if (order.status === 'Cancelled' && (newStatus === 'Pending' || newStatus === 'Shipped' || newStatus === 'Delivered')) {
        product.size.set(size, (product.size.get(size) || 0) - quantity);
      }

      await product.save();
    }
    order.status = newStatus;
    await order.save();
    res.json({ status: true, message: `Order status updated to ${newStatus}` });
  } catch (error) {
    console.error('Error updating order status:', error);
    const order = await Order.findOne({ orderId: req.params.id });
    res.status(500).json({ status: false, message: 'Internal Server Error', currentStatus: order ? order.status : null });
  }
};



const cancelOrder = async (req, res) => {
  try {
      const orderId = req.params.id;
      const order = await Order.findOne({ orderId: orderId });
      if (!order) {
          return res.status(404).send('Order not found');
      }
      if (order.status === 'Cancelled') {
          return res.status(400).json({ status: false, message: "Order is already cancelled." });
      }
      order.status = 'Cancelled';
      // order.cancellationReason = req.body.cancellationReason || "Admin cancelled"; 
      await order.save();
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
      if (order.paymentMethod !== 'COD') {
          const userId = order.userId;
          let wallet = await Wallet.findOne({ userId });
          if (!wallet) {
              wallet = new Wallet({ userId, balance: 0, transactionHistory: [] });
          }
          wallet.balance += order.finalAmount;
          wallet.transactionHistory.push({
              transactionType: 'credit',
              transactionAmount: order.finalAmount,
              description: `Refund for cancelled order ${order.orderId}`
          });

          await wallet.save();
      }
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
      const order = await Order.findOneAndDelete({ orderId: orderId });
      if (!order) {
        return res.status(404).send('Order not found');
      }
      // console.log("Deleted Order:", order);
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
      if (!order) {
          return res.status(404).render('error', { message: 'Order not found' });
      }
      const userId = order.userId;
      const addressDoc = await Address.findOne({ userId }).exec();
      const address = addressDoc.address.find(addr => addr._id.equals(order.address));  
      if (!address) {
          return res.status(404).send("Order address not found");
      }
      res.render('seeOrder', { order,address });
  } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: 'Internal Server Error' });
  }


}




const orderController ={
    getAllOrders,
    updateOrderStatus,
    cancelOrder,
    deleteOrder,
    seeOrders,
    getOrdersData,
};

export default orderController;