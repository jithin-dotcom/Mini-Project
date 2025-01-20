const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");


// const getCheckout = (req, res) => {
//     const cart = req.session.cart; // Adjust based on how your cart is stored
//     if (!cart || cart.length === 0) {
//         return res.redirect('/cart'); // Redirect to cart if it's empty
//     }

//     res.render('checkout', { 
//         cart, 
//         user: req.user, // Pass the user info if needed
//         addresses: req.user.addresses // Assuming user's addresses are stored here
//     });
// };




// const getCheckout = async (req, res) => {
//     try {
//         // Fetch the cart for the logged-in user
//         const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

//         // Check if the cart exists and has items
//         if (!cart || cart.items.length === 0) {
//             console.log("Cart is empty. Redirecting to /cart.");
//             return res.redirect('/cart');
//         }

//         // Fetch the user's addresses
//         const addresses = await Address.find({ userId: req.user._id });

//         // Render the checkout page with cart and address data
//         res.render('checkout', { 
//             cart: cart.items, 
//             user: req.user, 
//             addresses 
//         });
//     } catch (err) {
//         console.error("Error fetching data for checkout:", err);
//         res.status(500).send("Server error");
//     }
// };



// get checkout with total in session

const getCheckout = async (req, res) => {
    try {
        // Fetch user data from session
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const address = await Address.find({ userId: user });
        const cart = await Cart.findOne({ userId: user }).populate('items.productId');

        // Calculate the total price
        const total = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);



        // Calculate the total price
        // const total = cart.items.reduce((acc, item) => acc + item.quantity * item.productId.salePrice, 0);

        // Store total price in the session if needed
        req.session.totalPrice = total;

        // Render the checkout page and pass the necessary data
        res.render("checkout", {
            user: userData,
            addresses: address,
            cart: cart.items,
            totalPrice: cart.totalPrice,           // Pass the calculated total
            session: req.session    // Pass the entire session if needed
        });

    } catch (err) {
        console.error('Error fetching data for checkout:', err);
        res.status(500).send('Server error');
    }
};








// get checkout without total in session

// const getCheckout = async (req, res) => {
//     try {
       
//          // Fetch user data from session
//          const user = req.session.user;
//          const userData = await User.findOne({_id:user});
//          const address = await Address.find({userId:user});
//          const cart = await Cart.findOne({ userId: user }).populate('items.productId');
//          req.session.cart = cart.items;

//          // Render the checkout page and pass the necessary data
//         res.render("checkout",{
//             user:userData,
//             addresses:address,
//             cart:cart.items
//         });

//     } catch (err) {
//         console.error('Error fetching data for checkout:', err);
//         res.status(500).send('Server error');
//     }
// };

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