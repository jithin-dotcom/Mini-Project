const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");



const applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const userId = req.session.user; 

    try {
        // Fetch the coupon and user data
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId: userId });
        // console.log("user : ",user);

         
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }

        // Check if the coupon has expired
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0); // Normalize time for comparison
        const expireOnDate = new Date(coupon.expireOn);

        if (expireOnDate < todayDate) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }

        // Check if the coupon has already been used by the user
        if (user.usedCoupons && user.usedCoupons.includes(couponCode)) {
            return res.json({ success: false, message: 'Coupon already used.' });
        }

        // Check if the minimum price for the coupon is less than or equal to the totalPrice in the cart
        if (coupon.minimumPrice > cart.totalPrice) {
            return res.json({ success: false, message: 'Coupon cannot be applied. Minimum price not met.' });
        }

        // Calculate the new total price based on the coupon offer
        const newTotal = cart.totalPrice - coupon.offerPrice;

        // Update the total price in the cart document
        cart.totalPrice = newTotal;
        await cart.save();

        // Record the coupon as used
        user.usedCoupons = user.usedCoupons || [];
        user.usedCoupons.push(couponCode);
        await user.save();

        // Update the coupon document to store the userId who used it
        coupon.userId = coupon.userId || [];
        coupon.userId.push(userId);
        await coupon.save();

        return res.json({ success: true, newTotal, couponDiscount: coupon.offerPrice });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};






//delete coupon new 

const deleteCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const userId = req.session.user._id; // Assuming user ID is stored in session

    try {
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId: userId }); // Fetch the user's cart

        if (!user || !cart) {
            return res.json({ success: false, message: 'User or cart not found.' });
        }

        // Check if the coupon is in the user's used coupons list
        const couponIndex = user.usedCoupons.indexOf(couponCode);
        if (couponIndex === -1) {
            return res.json({ success: false, message: 'Coupon not found in user\'s used coupons.' });
        }

        // Remove the coupon from the user's used coupons list
        user.usedCoupons.splice(couponIndex, 1);
        await user.save(); // Save the updated user data

        // Find the coupon and check if it was applied to the cart
        const coupon = await Coupon.findOne({ name: couponCode });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }


         // Remove the userId from the coupon's userId array
        const userIndexInCoupon = coupon.userId.indexOf(userId);
        if (userIndexInCoupon !== -1) {
            coupon.userId.splice(userIndexInCoupon, 1);
            await coupon.save(); // Save the updated coupon document
        }
       


        // Recalculate the total price without the coupon offer
        const newTotal = cart.totalPrice + coupon.offerPrice;

        // Update the total price in the cart document
        cart.totalPrice = newTotal;
        await cart.save(); // Save the updated cart
    

        res.json({ success: true, newTotal,couponDiscount: coupon.offerPrice});     //couponDiscount: coupon.offerPrice
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};







module.exports = {
    applyCoupon,
    deleteCoupon,
}
















































































































































































































































































// apply coupon with total stored in cart db  new

// const applyCoupon = async (req, res) => {
//     const { couponCode } = req.body;
//     const userId = req.session.user; 

//     try {
//         // Fetch the coupon and user data
//         const coupon = await Coupon.findOne({ name: couponCode, isList: true });
//         const user = await User.findById(userId);
//         const cart = await Cart.findOne({ userId: userId }); 

//         if (coupon) {
//             // Check if the coupon has already been used by the user
//             if (user.usedCoupons && user.usedCoupons.includes(couponCode)) {
//                 return res.json({ success: false, message: 'Coupon already used.' });
//             }

//               // Check if the minimum price for the coupon is less than or equal to the totalPrice in the cart
//             if (coupon.minimumPrice > cart.totalPrice) {
//                 return res.json({ success: false, message: 'Coupon cannot be applied. Minimum price not met.' });
//             }

//             // Calculate the new total price based on the coupon offer
//             const newTotal = cart.totalPrice - coupon.offerPrice;

//             // Update the total price in the cart document
//             cart.totalPrice = newTotal;
//             await cart.save(); 

//             // Record the coupon as used
//             user.usedCoupons = user.usedCoupons || [];
//             user.usedCoupons.push(couponCode);
//             await user.save(); 


             
//             // Update the coupon document to store the userId who used it
//             coupon.userId = coupon.userId || []; 
//             coupon.userId.push(userId); 
//             await coupon.save(); 

//             res.json({ success: true, newTotal,couponDiscount: coupon.offerPrice });
//         } else {
//             res.json({ success: false, message: 'Invalid or expired coupon.' });
//         }
//     } catch (error) {
//         console.error('Error applying coupon:', error);
//         res.status(500).json({ success: false, message: 'Server error.' });
//     }
// };
