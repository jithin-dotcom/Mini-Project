const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const Address = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");  
const Wallet = require("../../models/walletSchema");



function generateOtp(){
    const digit = "1234567890";
    let otp = "";
    for(let i = 0; i < 6; i++){
        otp += digit[Math.floor(Math.random()*10)];
    }
    return otp;
}

const sendVerificationEmail = async(email,otp)=>{
    try {
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP:${otp}</h4><br></b>`
        }
         
        const info = await transporter.sendMail(mailOptions);
        console.log("this is from sendVerificationEmail");
        console.log("Email sent:",info.messageId);
        return true;

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
}


const securePassword = async(password)=>{
    try {
        
       const passwordHash = await bcrypt.hash(password,10);
       return passwordHash;

    } catch (error) {
        
    }
}



const getForgotPassPage = async(req,res)=>{
    try {
        
        res.render("forgot-password");

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const forgotEmailValid = async(req,res)=>{
    try {
        
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        // console.log("req.body : ",req.body);
        if(findUser){
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            console.log("send email : ",emailSend);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("OTP:",otp);
            }else{
                res.json({success:false,message:"Failed to send OTP. Please try again"});
            }
        }else{
            res.render("forgot-password",{
                message:"User with this email does not exist"
            });
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }

}



const verifyForgotPassOtp = async(req,res)=>{
    try {
        
      const enteredOtp = req.body.otp;
      if(enteredOtp === req.session.userOtp){
       res.json({success:true,redirectUrl:"/reset-password"});
      }else{
        res.json({success:false,message:"OTP not matching"});
      }

    } catch (error) {
        res.status(500).json({success:false,message:"An error occured. Please try again "});
    }
}


const getResetPassPage = async(req,res)=>{
    try {
        
       res.render("reset-password");

    } catch (error) {
        res.redirect("/pageNotFound");

    }
}


const resendOtp = async(req,res)=>{
    try {
        
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("this is resendOtp");
        console.log("Resending OTP to email:",email);
        const  emailSend = await sendVerificationEmail(email,otp);
        if(emailSend){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resend OTP Successful"});
        }
    } catch (error) {
        console.error("Error in resend oto",error);
        res.status(500).json({success:false,message:"Internal server error"});
    }
}


const postNewPassword = async(req,res)=>{
    try {
        
        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1===newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
           
            res.redirect("/login");   //redirect to render and message added
          

        } else{
            res.render("reset-password",{message:'Passwords dont match'});

        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}






const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userId });

        // Order Pagination (unchanged)
        const orderLimit = 6;
        const orderPage = parseInt(req.query.orderPage) || 1;
        const orderSkip = (orderPage - 1) * orderLimit;
        const orderData = await Order.find({ userId: userId })
            .sort({ createdOn: -1 })
            .skip(orderSkip)
            .limit(orderLimit);

        const totalOrders = await Order.countDocuments({ userId: userId });
        const totalOrderPages = Math.ceil(totalOrders / orderLimit);

        // Wallet Data and Transaction Pagination
        let walletData = await Wallet.findOne({ userId: userId });
        if (!walletData) {

             // Create a new wallet if it doesn't exist
             walletData = await Wallet.create({
                userId: userId,
                balance: 0,
                transactionHistory: []
            });
            // throw new Error("Wallet not found");
        }

        const walletLimit = 5; // Number of transactions per page
        const walletPage = parseInt(req.query.walletPage) || 1;
        const walletSkip = (walletPage - 1) * walletLimit;

        const totalWalletTransactions = walletData.transactionHistory.length;
        const walletTransactions = walletData.transactionHistory
            .slice()
            .reverse()
            .slice(walletSkip, walletSkip + walletLimit);

        const totalWalletPages = Math.ceil(totalWalletTransactions / walletLimit);

        res.render('profile', {
            user: userData,
            userAddress: addressData,
            orders: orderData,
            wallet: {
                ...walletData.toObject(),
                transactionHistory: walletTransactions, // Only pass paginated transactions
            },
            currentOrderPage: orderPage,
            totalOrderPages: totalOrderPages,
            orderLimit: orderLimit,
            currentWalletPage: walletPage,
            totalWalletPages: totalWalletPages,
            walletLimit: walletLimit
        });
    } catch (error) {
        console.error("Error retrieving profile data:", error);
        res.redirect("/pageNotFound");
    }
};





const changeEmail = async(req,res)=>{
    try {
        res.render("change-email");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


//change email from profile first otp
const changeEmailValid = async(req,res)=>{
    try {
        
        const {email} = req.body;
        console.log("req.body : ",req.body);
        const userExists = await User.findOne({email});
        console.log("req.session.user.email : ",req.session.user.email);
        
        if(userExists && email == req.session.user.email){
            
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-email-otp");
                console.log("this is changeEmailValid");
                console.log("Email send: ",email);
                console.log("OTP: ",otp);
            }else{
                res.json("email-error");
            }

        }else{
            res.render("change-email",{
                message : "User with this email does not exist "
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

//verify otp for change in email
const verifyEmailOtp = async(req,res)=>{
    try {
        
        const  enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("new-email",{
                userData : req.session.userData,
            })
        }else{
            res.render("change-email-otp",{
                message : "OTP not matching",
                userData : req.session.userData
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound");   
    }
};




const updateEmail = async(req,res)=>{
    try {
        
        const newEmail = req.body.newEmail;
        const userId = req.session.user;
       
        req.session.user.email = newEmail;   //new code ehange email not working from profile
        
        await User.findByIdAndUpdate(userId,{email:newEmail});
        res.redirect("/userProfile");

    } catch (error) {

        res.redirect("/pageNotFound");
    }
}

const changePassword = async(req,res)=>{
    try {
        res.render("change-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const changePasswordValid = async(req,res)=>{
    try {
        
        const {email} = req.body;
        const userExists = await User.findOne({email});
        if(userExists && email == req.session.user.email){
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("this is changePasswordValid");
                console.log("OTP: ",otp);
            }else{
                res.json({
                    success:false,
                    message: "Failed to send OTP",
                })
            }
        }else{
            res.render("change-password",{
                message:"User with this email does not exist"
            })
        }

    } catch (error) {
        console.error("Error in changing password");
        res,redirect("/pageNotFound");
    }
}

const verifyChangePassOtp = async(req,res)=>{
    try {
        
        const enteredOtp = req.body.otp.trim();
        console.log("this is verifyChangePassOtp");
        console.log("Stored OTP:", req.session.userOtp);
        console.log("Entered OTP:", enteredOtp);
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:"OTP not matching"});
        }

    } catch (error) {
        res.status(500).json({success:false,message:"An error occured during changing password"});
    }
}


const addAddress = async(req,res)=>{
    try {
        
        const user = req.session.user;
        res.render("add-address",{user:user});

    } catch (error) {
        
        res.redirect("/pageNotFound");

    }
}


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
        res.redirect("/userProfile");

    } catch (error) {
        
       console.error("Error adding address ",error);
       res.redirect("/pageNotFound");

    }
}



const editAddress = async(req,res)=>{
  try {
    
    const addressId = req.query.id;
    const user = req.session.user;

    // Search for the address document containing the specified address ID
    const currAddress =  await Address.findOne({
        "address._id" : addressId,
    });
    if(!currAddress){
        return res.redirect("/pageNotFound");
    }

     // Locate the specific address within the `address` array using the address ID
    const addressData = currAddress.address.find((item)=>{
        return item._id.toString()===addressId.toString();   // Match the address ID as a string
    })
    if(!addressData){
        return res.redirect("/pageNotFound");
    }

     // Render the "edit-address" page and pass the found address data and user session data
    res.render("edit-address",{address:addressData,user:user});

  } catch (error) {
    console.error("Error in edit address",error);
    res.redirect("/pageNotFound");
  }
}


const postEditAddress = async(req,res)=>{
    try {

        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;

        // Find the document containing the specified address ID
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
           return res.redirect("/pageNotFound");
        }

        // Update the specific address in the `address` array with the new data
        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{          // Use positional operator `$` to target the specific address
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone,
                }
            }}
        )
     
      res.redirect("/userProfile");
    } catch (error) {
        console.error("Error in updating Address",error);
        res.redirect("/pageNotFound");
    }
}


const deleteAddress = async(req,res)=>{
    try {
        
        const addressId = req.query.id;
        console.log("Query Address ID:", addressId);

         // Find the document containing the specified address ID
        const findAddress = await Address.findOne({"address._id":addressId});
        // console.log("Find Address Result:", findAddress);
        if(!findAddress){
            return res.status(404).send("Address not found");
        }

        
         // Use the $pull operator to remove the specific address from the `address` array
        await Address.updateOne({
            "address._id":addressId
        },
        {
            $pull : {
                address : {
                    _id:addressId,
                }
            }
        }
    )
    res.redirect("/userProfile");

    } catch (error) {
        console.error("Error in deleting address",error);
        res.redirect("/pageNotFound");
    }
}



const viewOrders = async(req,res)=>{

    try {
        const orderId = req.params.id;
        const userId = req.session.user._id;
        const order = await Order.findById(orderId);
        //  // Find the order by ID and populate the address field
        //  const order = await Order.findById(orderId).populate('address');
        // console.log("order : ",order);
        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

          // Find the user's address document
          const addressDoc = await Address.findOne({ userId }).exec();
          // Find the specific address object in the address array
        const address = addressDoc.address.find(addr => addr._id.equals(order.address));
        // console.log("address : ",address); 

        if (!address) {
            return res.status(404).send("Order address not found");
        }


        res.render('viewOrder', { order,address });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }


}




const cancelOrder = async (req, res) => {
    const orderId = req.params.id;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).send("Order not found.");
        }

        // Check if the order is still in a cancellable state
        if (order.status !== "Pending" && order.status !== "Shipped") {
            return res.status(400).send("Order cannot be cancelled.");
        }

        

        // Update the order status to "Cancelled"
        order.status = "Cancelled";
        await order.save();

        // Iterate over the ordered items to update the stock of the products
        for (const item of order.orderedItems) {
            const product = await Product.findById(item.product);

            if (product) {
                // Get the current stock for the specific size
                const currentStock = product.size.get(item.size);
                if (currentStock !== undefined) {
                    // Increase the stock by the quantity of the canceled order
                    product.size.set(item.size, currentStock + item.quantity);

                    // Save the updated product with the new stock
                    await product.save();
                    console.log(`Stock updated for product ${product.productName}, size ${item.size}.`);
                }
            }
        }

        //add new for razorpay cancel payment bug when cancelling
        // Check payment method and credit the amount to the wallet if not "Cash on Delivery"
        if (order.paymentMethod !== "cashOnDelivery" && order.paymentStatus !== "notCompleted") {
            const wallet = await Wallet.findOne({ userId: order.userId });

            if (wallet) {
                // Add the refunded amount to the wallet balance
                wallet.balance += order.finalAmount;

                // Add transaction history entry
                wallet.transactionHistory.push({
                    transactionType: 'credit',
                    transactionAmount: order.finalAmount,
                    description: `Refund for cancelled order ${order.orderId}`
                });

                await wallet.save();
            } else {
                // Create a new wallet if none exists
                const newWallet = new Wallet({
                    userId: order.userId,
                    balance: order.finalAmount,
                    transactionHistory: [{
                        transactionType: 'credit',
                        transactionAmount: order.finalAmount,
                        description: `Refund for cancelled order ${order.orderId}`
                    }]
                });

                await newWallet.save();
            }
        }

         //add new for razorpay cancel payment bug when cancelling
        // If paymentStatus is "notCompleted", do not process refund and update paymentStatus to "completed"
        if (order.paymentStatus === "notCompleted") {
            order.paymentStatus = "completed"; // Update paymentStatus to "completed"
        }
        await order.save();

        // Redirect back to the user profile or order page
        // res.redirect("/userProfile");
    } catch (err) {
        console.error("Error cancelling order:", err);
        res.status(500).send("Error cancelling order.");
    }
};





const returnOrder = async (req, res) => {
    const orderId = req.params.id;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).send("Order not found.");
        }

        // Check if the order status allows return
        if (order.status !== "Delivered") {
            return res.status(400).send("Order cannot be returned.");
        }

        // Update the order status to "Returned"
        order.status = "Returned";
        await order.save();

        // Process refund or any financial adjustment if applicable
        if (order.paymentMethod === "cashOnDelivery" || order.paymentMethod !== "cashOnDelivery") {                        //change made
            const wallet = await Wallet.findOne({ userId: order.userId });

            if (wallet) {
                // Add the refunded amount to the wallet balance
                wallet.balance += order.finalAmount;

                // Add transaction history entry
                wallet.transactionHistory.push({
                    transactionType: 'credit',
                    transactionAmount: order.finalAmount,
                    description: `Refund for returned order ${order.orderId}`
                });

                await wallet.save();
            } else {
                const newWallet = new Wallet({
                    userId: order.userId,
                    balance: order.finalAmount,
                    transactionHistory: [{
                        transactionType: 'credit',
                        transactionAmount: order.finalAmount,
                        description: `Refund for returned order ${order.orderId}`
                    }]
                });

                await newWallet.save();
            }
        }

        // Redirect back to the user profile or order page
        // res.redirect("/userProfile");
    } catch (err) {
        console.error("Error returning order:", err);
        res.status(500).send("Error returning order.");
    }
};












module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    viewOrders,
    cancelOrder,
    returnOrder,
};