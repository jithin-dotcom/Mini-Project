const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");







const getCheckout = async (req, res) => {
    try {
        // Fetch user data from session
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const address = await Address.find({ userId: user });
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');
        const wallet = await Wallet.findOne({userId: user});
        const coupon = await Coupon.find();
        // const userId = user._id;
        // console.log("userId ch : ",userId);
        
        // console.log("user checkout : ",userData);

        // Calculate the total price
        const total = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);


        // Store total price in the session 
        req.session.totalPrice = total;


          // Find coupons that match the criteria and exclude the current user's userId from the userId array
        //   const todayDate = new Date();
        //   todayDate.setHours(0, 0, 0, 0); // Normalize time for comparison
        //   const validCoupons = await Coupon.find({
        //       isList: true,  // Coupon must be listed
        //       expireOn: { $gte: todayDate },  // Coupon must not be expired
        //       minimumPrice: { $gt: total },  // Coupon must have a higher minimumPrice than the total
        //       userId: { $nin: [userId] },
        //     //   userId: { $ne: userId }  // Exclude coupons where the current user ID is in the userId array
        //   });



        // const validCoupons = await Coupon.find({
        //     isList: true,  // Coupon must be listed
        //     expireOn: { $gte: todayDate },  // Coupon must not be expired
        //     minimumPrice: { $gt: total },  // Coupon must have a higher minimumPrice than the total
        //     $or: [
        //         { userId: { $nin: [userId] } },  // Exclude coupons where the userId array contains the current user's ID
        //         { userId: { $size: 0 } }  // Include coupons with an empty userId array
        //     ]
        // });

        //   console.log("validCoupon : ",validCoupons);
        
        const couponDiscount = req.session.couponDiscount || 0;

        // Render the checkout page and pass the necessary data
        res.render("checkout", {
            user: userData,
            addresses: address,
            cart: cart.items,
            totalPrice: cart.totalPrice,           
            session: req.session,
            wallet,
            coupon, 
            couponDiscount,  
        });

    } catch (err) {
        console.error('Error fetching data for checkout:', err);
        res.status(500).send('Server error');
    }
};







const postAddAddress = async(req,res)=>{
    try {
        
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body;

        const userAddress = await Address.findOne({userId:userData._id});

         // Check if the user already has an address record in the Address collection
        if(!userAddress){
             
             // If no address record exists, create a new address document
            const newAddress = new Address({

               userId : userData._id,
               address : [{addressType,name,city,landMark,state,pincode,phone,altPhone}],              

            });
            await newAddress.save();
        }else{

             // If an address record already exists, add the new address to the address array
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }
        res.redirect("/checkout");

    } catch (error) {
        
       console.error("Error adding address ",error);
       res.redirect("/pageNotFound");

    }
}





module.exports = {
    getCheckout,
    postAddAddress
}