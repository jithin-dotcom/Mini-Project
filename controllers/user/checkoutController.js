
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import Wallet from "../../models/walletSchema.js";
import Coupon from "../../models/couponSchema.js";
import { STATUS_CODES } from "../../constants/statusCodes.js";
import { MESSAGES } from "../../constants/messages.js";





const getCheckout = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const address = await Address.find({ userId: user });
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');
        const wallet = await Wallet.findOne({userId: user})|| { balance: 0 }; 
    
        
        for (const item of cart.items) {
            const product = await Product.findById( item.productId);
            if (!product) continue;

            const availableStock = product.size.get(item.size); 

            if (availableStock < item.quantity) {
                return res.redirect("/cart");
               
            }
        }

        const total = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

        req.session.totalPrice = total;
    
        const availableCoupon = await Coupon.find({
            userId: { $nin: [user] },
            minimumPrice: { $lte: total },
            expireOn: { $gt: new Date() } 
        });

        
        const couponDiscount = req.session.couponDiscount || 0;

        res.render("checkout", {
            user: userData,
            addresses: address,
            cart: cart.items,
            totalPrice: cart.totalPrice,           
            session: req.session,
            wallet,
            coupon: availableCoupon||[], 
            couponDiscount,  
        });

    } catch (err) {
        console.error('Error fetching data for checkout:', err);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};






const postAddAddress = async(req,res)=>{
    try {
        
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body;

        const userAddress = await Address.findOne({userId:userData._id});

        if(!userAddress){
            const newAddress = new Address({

               userId : userData._id,
               address : [{addressType,name,city,landMark,state,pincode,phone,altPhone}],              

            });
            await newAddress.save();
        }else{

            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }
        res.redirect("/checkout");

    } catch (error) {
        
       console.error("Error adding address ",error);
       res.redirect("/pageNotFound");

    }
}




const checkoutController = {
    getCheckout,
    postAddAddress,
};


export default checkoutController;