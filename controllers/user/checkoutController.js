const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");







const getCheckout = async (req, res) => {
    try {
        // Fetch user data from session
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const address = await Address.find({ userId: user });
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');
        const wallet = await Wallet.findOne({userId: user});

        // Calculate the total price
        const total = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);


        // Store total price in the session 
        req.session.totalPrice = total;

        // Render the checkout page and pass the necessary data
        res.render("checkout", {
            user: userData,
            addresses: address,
            cart: cart.items,
            totalPrice: cart.totalPrice,           
            session: req.session,
            wallet,   
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