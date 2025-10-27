import Coupon from "../../models/couponSchema.js";
import User from "../../models/userSchema.js";
import Cart from "../../models/cartSchema.js";
import Order from "../../models/orderSchema.js";
import { STATUS_CODES } from "../../constants/statusCodes.js";
import { MESSAGES } from "../../constants/messages.js";



const applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const userId = req.session.user; 

    try {
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId: userId });
         
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const expireOnDate = new Date(coupon.expireOn);

        if (expireOnDate < todayDate) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }

        if (user.usedCoupons && user.usedCoupons.includes(couponCode)) {
            return res.json({ success: false, message: 'Coupon already used.' });
        }

        if (coupon.minimumPrice > cart.totalPrice) {
            return res.json({ success: false, message: 'Coupon cannot be applied. Minimum price not met.' });
        }

        const newTotal = cart.totalPrice - coupon.offerPrice;

        cart.totalPrice = newTotal;
        await cart.save();

        user.usedCoupons = user.usedCoupons || [];
        user.usedCoupons.push(couponCode);
        await user.save();

        coupon.userId = coupon.userId || [];
        coupon.userId.push(userId);
        await coupon.save();

        return res.json({ success: true, newTotal, couponDiscount: coupon.offerPrice });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: message.INTERNAL_SERVER_ERROR });
    }
};








const deleteCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const userId = req.session.user._id; 

    try {
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId: userId }); 

        if (!user || !cart) {
            return res.json({ success: false, message: 'User or cart not found.' });
        }

        const couponIndex = user.usedCoupons.indexOf(couponCode);
        if (couponIndex === -1) {
            return res.json({ success: false, message: 'Coupon not found in user\'s used coupons.' });
        }

        user.usedCoupons.splice(couponIndex, 1);
        await user.save(); 

        const coupon = await Coupon.findOne({ name: couponCode });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon.' });
        }

        const userIndexInCoupon = coupon.userId.indexOf(userId);
        if (userIndexInCoupon !== -1) {
            coupon.userId.splice(userIndexInCoupon, 1);
            await coupon.save(); 
        }
       
        const newTotal = cart.totalPrice + coupon.offerPrice;

        cart.totalPrice = newTotal;
        await cart.save(); 
    

        res.json({ success: true, newTotal,couponDiscount: coupon.offerPrice});    
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};



const couponController = {
    applyCoupon,
    deleteCoupon,
};

export default couponController;
