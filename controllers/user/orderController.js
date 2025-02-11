const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");  
const mongoose = require("mongoose");
const { name } = require("ejs");
const Razorpay = require("razorpay");
const crypto = require('crypto');
const Wallet = require("../../models/walletSchema")
const env = require("dotenv").config();




const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});







const placeOrder = async (req, res) => {
    try {
        const { addressId, cartItems, totalPrice, paymentMethod,paymentStatus } = req.body;
        const userId = req.session.user._id;
        let wallet = await Wallet.findOne({ userId });
       
        if (!wallet) {
            wallet = { balance: 0, transactionHistory: [] };
        }

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.json({ success: false, message: "Invalid address ID format." });
        }

        const addressDoc = await Address.findOne({ "address._id": new mongoose.Types.ObjectId(addressId) });
        if (!addressDoc) {
            return res.json({ success: false, message: "Address not found." });
        }

        const selectedAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.json({ success: false, message: "Address not found." });
        }

        let totalDiscount = 0;
        let finalAmount = totalPrice;

        let parsedCartItems = Array.isArray(cartItems) ? cartItems : JSON.parse(cartItems);
        const mappedCartItems = await Promise.all(parsedCartItems.map(async item => {
            const product = await Product.findById(item.productId);
            
            const productOffer = product.productOffer || 0; 

            const productDiscount = (productOffer / 100) * item.price * item.quantity;
            totalDiscount += productDiscount; 

            finalAmount = totalPrice - totalDiscount;

            return {
                product: product._id,
                quantity: item.quantity,
                price: item.price,
                size: item.size,
                name: product.productName,
                image: product.productImage[0],
            };
        }));
         

        if (wallet.balance < finalAmount && paymentMethod === 'wallet') {
            return res.json({ success: false, message: "Insufficient wallet balance." });
        }

        
        const order = new Order({
            orderedItems: mappedCartItems,
            totalPrice,
            address: new mongoose.Types.ObjectId(addressId),
            status: "Pending",
            paymentMethod,
            paymentStatus,
            userId,
            finalAmount,
            discount: totalDiscount, 
        });

        const savedOrder = await order.save();


        if (paymentMethod === "wallet") {
            
            if (!wallet) {
                return res.json({ success: false, message: "Wallet not found." });
            }

            wallet.balance -= finalAmount;
            wallet.transactionHistory.push({
                transactionType: 'debit',
                transactionAmount: finalAmount,
                description: `Payment for order ${savedOrder.orderId}`
            });

            await wallet.save();
        }

        const cart = await Cart.findOne({ userId });          
        if (!cart) {
            return res.json({ success: false, message: "Cart not found." });
        }


        for (const item of mappedCartItems) {
            const product = await Product.findById(item.product);
            if (product) {
                const currentStock = product.size.get(item.size);
                if (currentStock !== undefined && currentStock >= item.quantity) {
                    product.size.set(item.size, currentStock - item.quantity);
                    await product.save();
                } else {
                    return res.json({ success: false, message: `Not enough stock for product ${product.productName}.` });
                }
            }

            cart.items = cart.items.filter((cartItem) => cartItem.productId.toString() !== item.product.toString() || cartItem.size !== item.size);
            cart.totalPrice = 0;   
        }

        await cart.save();  
        req.session.orderId = order._id;
        res.json({ success: true, message: "Order placed successfully!", order: savedOrder, orderId:order._id });
    } catch (error) {
        console.error("Error placing order:", error);
        res.json({ success: false, message: "Failed to place order. Please try again." });
    }
};







const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, addressId, paymentMethod } = req.body;
        const rzpOrder = await rzp.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt#${addressId}`,
            payment_capture: true,
            notes: {
                orderType: "Pre",
                paymentMethod
            }
        });

        res.json({ orderId: rzpOrder.id, razorpayKey: process.env.RAZORPAY_ID_KEY });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).send("An error occurred while creating the Razorpay order.");
    }
};





const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature,orderId } = req.body;
        let order;
        if (orderId) {
            order = await Order.findOne({ _id: orderId });
            if (!order) {
                return res.json({ success: false, message: "Order not found." });
            }
        }

        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');
            
        if ( generatedSignature === razorpay_signature) {
             if (order && order.paymentStatus === "notCompleted") {
                order.paymentStatus = "completed";
                await order.save(); 
            }
            
            res.json({ success: true, message: "Payment verified successfully." });
        } else {
            
            res.json({ success: false, message: "Payment verification failed." });
        }
    } catch (error) {
        console.error("Error verifying Razorpay payment:", error);
        res.status(500).send("An error occurred while verifying the payment.");
    }
};





const orderDetails = async (req, res) => {
  
    try {
        const orderId = req.session.orderId;
        const userId = req.session.user._id;
        const order = await Order.findOne({ orderId }).populate('orderedItems.product').exec();
        
        const addressDoc = await Address.findOne({ userId }).exec();
        
        if (!addressDoc) {
            return res.status(404).send("Address not found");
        }
        const address = addressDoc.address.find(addr => addr._id.equals(order.address));
    
        if (!address) {
            return res.status(404).send("Order address not found");
        }

     
        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render('orderDetails', { order , address}); 
    } catch (err) {
        console.error("Error fetching order details:", err);
        res.status(500).send("Error fetching order details");
    }
}








module.exports = {
    placeOrder,
    orderDetails,
    createRazorpayOrder,
    verifyRazorpayPayment, 
    
}

































































































































































































//place order latest without discount price 


// const placeOrder = async (req, res) => {
//     try {
//         const { addressId, cartItems, totalPrice, paymentMethod } = req.body;
//         const userId = req.session.user._id;

//         console.log("req.body :" , req.body);


//         // Validate and fetch address
//         if (!mongoose.Types.ObjectId.isValid(addressId)) {
//             return res.json({ success: false, message: "Invalid address ID format." });
//         }

//         const addressDoc = await Address.findOne({ "address._id": new mongoose.Types.ObjectId(addressId) });
//         if (!addressDoc) {
//             return res.json({ success: false, message: "Address not found." });
//         }

//         const selectedAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
//         if (!selectedAddress) {
//             return res.json({ success: false, message: "Address not found." });
//         }

//         const discount = 0;
//         const finalAmount = totalPrice - discount

//         // Parse and map cart items
//         let parsedCartItems = Array.isArray(cartItems) ? cartItems : JSON.parse(cartItems);
//         const mappedCartItems = await Promise.all(parsedCartItems.map(async item => {
//             const product = await Product.findById(item.productId);
//             return {
//                 product: product._id,
//                 quantity: item.quantity,
//                 price: item.price,
//                 size: item.size,
//                 name: product.productName,
//                 image: product.productImage[0],
                
//             };
//         }));

//         // Create new order
//         const order = new Order({
//             orderedItems: mappedCartItems,
//             totalPrice,
//             address: new mongoose.Types.ObjectId(addressId),
//             status: "Pending",
//             paymentMethod,
//             userId,
//             finalAmount,
//         });


//         console.log("order : ",order)
//         const savedOrder = await order.save();

//         // Reduce stock and remove cart items
//         for (const item of mappedCartItems) {
//             const product = await Product.findById(item.product);
//             if (product) {
//                 const currentStock = product.size.get(item.size);
//                 if (currentStock !== undefined && currentStock >= item.quantity) {
//                     product.size.set(item.size, currentStock - item.quantity);
//                     await product.save();
//                 } else {
//                     return res.json({ success: false, message: `Not enough stock for product ${product.productName}.` });
//                 }
//             }
//         }

//         await Cart.deleteMany({ userId });
//         req.session.orderId = order._id;
//         res.json({ success: true, message: "Order placed successfully!", order: savedOrder });
//     } catch (error) {
//         console.error("Error placing order:", error);
//         res.json({ success: false, message: "Failed to place order. Please try again." });
//     }
// };
