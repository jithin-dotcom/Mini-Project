const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand  = require("../../models/brandSchema");
const Banner = require("../../models/bannerSchema");
const OTP = require("../../models/otpSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");

const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const { productDetails } = require("./productController");




const loadSignup = async(req,res) => {
    try{
        return res.render("signup");
    }catch(error){
        console.log("home page not loading:",error);
        res.status(500).send("server Error");
    }
} 




const pageNotFound = async(req,res) => {
     try{
        res.render("page_404");
     }catch(error){
        res.redirect("/pageNotFound");
     }
}




const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({isListed: true});

        let productData = await Product.find(
            {
                isBlocked: false,
                category: {$in: categories.map(category => category._id)},

            }
        ).sort({createdAt: -1});

        productData = productData.slice(0, 4);  
        let cartItemCount = 0;
        let wishlistItemCount = 0;

        if (user) {
            const userData = await User.findOne({ _id: user._id });
            
            if (userData && userData.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }

                    return res.render("login",{message:"User is blocked by admin"});
                });
            } else {
                const cart = await Cart.findOne({userId:user._id})
                if(cart){
                    cartItemCount = cart.items.length;
                }
                const wishlist = await Wishlist.findOne({userId: user._id});
                if(wishlist){
                    wishlistItemCount = wishlist.items.length;
                }

                res.render("home", { user: userData, products: productData, cartItemCount: cartItemCount, wishlistItemCount: wishlistItemCount});
            }
        } else {
            res.render("home", { products: productData });
        }
    } catch (error) {
        console.error("Homepage error:", error);
        res.status(500).send("Server error");
    }
};



function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}


async function sendVerificationEmail(email,otp){
    try{

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

       const info = await transporter.sendMail({
           from:process.env.NODEMAILER_EMAIL,
           to: email,
           subject:"Verify your account",
           text:`Your OTP is ${otp}`,
           html:`<b>Your OTP : ${otp}</b>`,
       })
       return info.accepted.length > 0

    }catch(error){
       console.error("Error sending email",error);
       return false;
    } 
}







const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cPassword } = req.body;

        if (password !== cPassword) {
            return res.render("signup", { message: "Passwords don't match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOtp();

        const emailSend = await sendVerificationEmail(email, otp);
        if (!emailSend) {
            return res.render("signup", { message: "Failed to send verification email. Please try again." });
        }
        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        req.session.userData = { name, phone, email, password };
        console.log("req body signup : ",req.body)

        res.render("verify-otp");
        console.log("OTP Sent", otp);

    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotfound");
    }
};




const securePassword = async(password)=>{
    try{
       const passwordHash = await bcrypt.hash(password,10);
       return passwordHash;
    }catch(error){
        console.error("Error hashing password:", error);
        throw error; 
    }
}





const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const userData = req.session.userData;
        console.log("verify otp req.body",req.body)

        if (!userData) {
            return res.status(400).json({ success: false, message: "Session expired. Please sign up again." });
        }

        const otpRecord = await OTP.findOne({ email: userData.email, otp });

        if (otpRecord) {
            const passwordHash = await securePassword(userData.password);
            const newUser = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash,
            });
            await newUser.save();
            req.session.user = newUser;
            await OTP.deleteOne({ email: userData.email });
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};






const resendOtp = async (req, res) => {
    try {
       
        const { email } = req.session.userData;
        console.log("email to send : ",email);
        const otp = generateOtp();
        req.session.userOtp = otp; 
        const emailSend = await sendVerificationEmail(email, otp);
        if (!emailSend) {
            return res.status(500).json({ success: false, message: "Failed to send verification email. Please try again." });
        }
        const existingOtp = await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { new: true, upsert: true } 
        );
        console.log("this is resendOtp");
        console.log("OTP Sent:", otp);
        res.json({ success: true, message: "OTP resent successfully" });

    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "An error occurred while resending OTP" });
    }
};




const loadLogin = async(req,res)=>{
    try{
       
       if(!req.session.user){
         return res.render("login");
       }else{
         res.redirect("/");
       }

    }catch(error){
        console.error("Error loading login page:", error);
        res.redirect("pageNotFound");
    }
}








const login = async(req,res)=>{
    try{

       const {email,password} = req.body;
       const findUser = await User.findOne({isAdmin:0,email:email});
       
       if(!findUser){
          return res.render("login",{message:"User not found"});
       }
       if(findUser.isBlocked){
        return res.render("login",{message:"User is blocked by admin"});
       }
           
       const passwordMatch = await bcrypt.compare(password,findUser.password);
       if(!passwordMatch){
        return res.render("login",{message:"Incorrect Password"});
       }

          req.session.user = {
                 _id: findUser._id,
                  name: findUser.name,
                  email: findUser.email
                };


       res.redirect("/");   

    }catch(error){
       console.error("login error",error);
       res.render("login",{message:"Login failed. Please try again later"});
    }
}



const logout = async (req, res) => {
    try {
        req.session.user = null; 
    
        res.redirect("/");
    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};







const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());
        const brands = await Brand.find({ isBlocked: false });
        const unblockedBrandNames = brands.map((brand) => brand.brandName);  

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        let searchQuery = req.query.query || '';
        let filter = {
            isBlocked: false,
            category: { $in: categoryIds }
        };

        if (req.query.category) {
            filter.category = req.query.category;
        }
        if (req.query.brand) {
            filter.brand = req.query.brand;
        }

        if (req.query.minPrice || req.query.maxPrice) {
            filter.salePrice = {};
            if (req.query.minPrice) {
                filter.salePrice.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter.salePrice.$lte = parseFloat(req.query.maxPrice);
            }
        }
        if (searchQuery) {
            filter.productName = { $regex: ".*" + searchQuery + ".*", $options: "i" }; // Case-insensitive search
        }

        let sortOption = { createdAt: -1 }; 

        if (req.query.sort) {
            if (req.query.sort === 'lowToHigh') {
                sortOption = { salePrice: 1 }; 
            } else if (req.query.sort === 'highToLow') {
                sortOption = { salePrice: -1 }; 
            } else if (req.query.sort === 'atoz') {
                sortOption = { productName: 1 }; 
            } else if (req.query.sort === 'ztoa') {
                sortOption = { productName: -1 }; 
            }
        }
        const products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

         const filteredProducts = products.filter(product => {
            const totalStock = Object.values(product.size).reduce((acc, qty) => acc + qty, 0);
            return totalStock > 0 && unblockedBrandNames.includes(product.brand); 
        });
        
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        res.render("shop", {
            user: userData,
            products: filteredProducts,   
            category: categoriesWithIds,
            brand: brands,
            totalProducts,
            currentPage: page,
            totalPages,
            sort: req.query.sort || '',  
            searchQuery: searchQuery,  
            filters: req.query          
        });

    } catch (error) {
        console.error('Error loading shopping page:', error);
        res.redirect("/pageNotFound");
    }
};







const searchProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        let search = req.body.query;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());

        let searchResult = [];
        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            searchResult = req.session.filteredProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            );
        } else {
            searchResult = await Product.find({
                productName: { $regex: ".*" + search + ".*", $options: "i" },
                isBlocked: false,
                category: { $in: categoryIds }
            });
        }

        searchResult.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, endIndex);
        res.render("shop", {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            count: searchResult.length,
            sort: req.query.sort || ''  
        });
    } catch (error) {
        console.log("Error: ", error);
        res.redirect("/pageNotFound");
    }
};



const getLogout = async(req,res)=>{
    try {
        return res.redirect("/");
    } catch (error) {
        console.log("Unexpected error during logout", error);
    }
}




module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    searchProducts,
    getLogout,
    
};