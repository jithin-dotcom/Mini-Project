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



//signup load
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
        // Extract user session and fetch listed categories
        const user = req.session.user;
        const categories = await Category.find({isListed: true});

        // Fetch unblocked products with stock, belonging to listed categories
        let productData = await Product.find(
            {
                isBlocked: false,
                category: {$in: categories.map(category => category._id)},

            }
        ).sort({createdAt: -1});

        // productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));  // Latest added product

        productData = productData.slice(0, 4);  // Limit to first 4 products
        let cartItemCount = 0;
        let wishlistItemCount = 0;

        // If a user is logged in, fetch their details
        if (user) {
            const userData = await User.findOne({ _id: user._id });
            // const cart = await Cart.findOne

            // Check if the user is blocked
            if (userData && userData.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }

                    // Redirect to login page
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







// generate otp
function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}



// send verification email
async function sendVerificationEmail(email,otp){
    try{

        // Create a transporter
       const transporter = nodemailer.createTransport({
          service:"gmail",
          port:587,
          secure:false, // Use TLS
          requireTLS:true,
          auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
          }
       })

       // Send the email
       const info = await transporter.sendMail({
           from:process.env.NODEMAILER_EMAIL,
           to: email,
           subject:"Verify your account",
           text:`Your OTP is ${otp}`,
           html:`<b>Your OTP : ${otp}</b>`,
       })
       //contains email address if success
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

        // Save OTP to the database
        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Temporarily store user data in session for further steps after OTP verification
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
        throw error; // Propagate the error to handle it upstream
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

        // Check if the OTP matches the one in the database
        const otpRecord = await OTP.findOne({ email: userData.email, otp });

        if (otpRecord) {
            const passwordHash = await securePassword(userData.password);

            // Save user data in the database
            const newUser = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash,
            });
            await newUser.save();

            // Log the user in by storing their ID in the session
            // req.session.user = newUser.id;
            req.session.user = newUser;
            // req.session.user._id = newUser.id;
            // console.log("req.session.user._id  :",req.session.user._id );
            // console.log("req.session.user : ",req.session.user);

            // Clean up session data and OTP record
            // req.session.userData = null;
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
        // console.log("request body : ",req.body);

        // Generate a new OTP
        const otp = generateOtp();
        req.session.userOtp = otp; //added for profile change email
        // Send the OTP via email
        const emailSend = await sendVerificationEmail(email, otp);
        if (!emailSend) {
            return res.status(500).json({ success: false, message: "Failed to send verification email. Please try again." });
        }

        // Find and update the OTP document or create a new one
        const existingOtp = await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { new: true, upsert: true } // upsert creates a new document if one doesn't exist
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
       
         // Check if the user is already logged in by verifying the session
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

        // Find the user in the database who matches the email and is not an admin
       const {email,password} = req.body;
       const findUser = await User.findOne({isAdmin:0,email:email});
       
       if(!findUser){
          return res.render("login",{message:"User not found"});
       }
       if(findUser.isBlocked){
        return res.render("login",{message:"User is blocked by admin"});
       }
        

        // Compare the provided password with the stored hashed password
       const passwordMatch = await bcrypt.compare(password,findUser.password);
       if(!passwordMatch){
        return res.render("login",{message:"Incorrect Password"});
       }

    
        // If login is successful, store user data in the session
          req.session.user = {
                 _id: findUser._id,
                  name: findUser.name,
                  email: findUser.email
                };


       res.redirect("/");   // Redirect to homepage after successful login

    }catch(error){
       console.error("login error",error);
       res.render("login",{message:"Login failed. Please try again later"});
    }
}



const logout = async (req, res) => {
    try {
        req.session.user = null; // Clear only the user session  new 
    
        res.redirect("/");
    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};







const loadShoppingPage = async (req, res) => {
    try {
        // Fetch user data from session
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        // Fetch all categories that are listed (active)
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());

        // Fetch all brands that are not blocked
        const brands = await Brand.find({ isBlocked: false });
        const unblockedBrandNames = brands.map((brand) => brand.brandName);   //new added

        // Pagination logic
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        // Get the search query from request (if any)
        let searchQuery = req.query.query || '';

        // Initialize filter object
        let filter = {
            isBlocked: false,
            category: { $in: categoryIds }
        };

        // Apply category filter if provided
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Apply brand filter if provided
        if (req.query.brand) {
            filter.brand = req.query.brand;
        }

        // Apply price filter if provided
        if (req.query.minPrice || req.query.maxPrice) {
            filter.salePrice = {};
            if (req.query.minPrice) {
                filter.salePrice.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                filter.salePrice.$lte = parseFloat(req.query.maxPrice);
            }
        }

        // Apply search query if provided
        if (searchQuery) {
            filter.productName = { $regex: ".*" + searchQuery + ".*", $options: "i" }; // Case-insensitive search
        }

        // Default sorting order
        let sortOption = { createdAt: -1 }; // Default: newest first

        // Apply sorting based on query parameter
        if (req.query.sort) {
            if (req.query.sort === 'lowToHigh') {
                sortOption = { salePrice: 1 }; // Sort by price ascending
            } else if (req.query.sort === 'highToLow') {
                sortOption = { salePrice: -1 }; // Sort by price descending
            } else if (req.query.sort === 'atoz') {
                sortOption = { productName: 1 }; // Sort by product name A to Z
            } else if (req.query.sort === 'ztoa') {
                sortOption = { productName: -1 }; // Sort by product name Z to A
            }
        }

        // Fetch products with filters, search, and sorting applied
        const products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

         

         //render products with total stock greater than zero and brand blocked 
         const filteredProducts = products.filter(product => {
            // const totalStock = Array.from(product.size.values()).reduce((acc, qty) => acc + qty, 0);
            const totalStock = Object.values(product.size).reduce((acc, qty) => acc + qty, 0);
            return totalStock > 0 && unblockedBrandNames.includes(product.brand); // Check brand unblocked
        });
        

   

        // Count the total number of products that match the criteria
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Prepare categories with only their _id and name for easier rendering in the view
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        // Render the shop page and pass the necessary data, including search query
        res.render("shop", {
            user: userData,
            products: filteredProducts,   //new added     : filteredProducts, 
            category: categoriesWithIds,
            brand: brands,
            totalProducts,
            currentPage: page,
            totalPages,
            sort: req.query.sort || '',  // Pass sort parameter to the view
            searchQuery: searchQuery,  // Pass the search query to the view
            filters: req.query          // Pass all query parameters (filters) to the view
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

        // Pass the sort parameter to the view
        res.render("shop", {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            count: searchResult.length,
            sort: req.query.sort || ''  // Ensure `sort` is passed to the view
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