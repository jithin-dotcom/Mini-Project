const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");


const productDetails = async(req,res)=>{
    try {
        const userId = req.session.user;

         // Fetch user data
        const userData = await User.findById(userId);

         // Fetch product details and populate category
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');


         // Initialize total quantity to 0
         let totalSizeQuantity = 0;

         // Iterate over the 'size' Map and sum the quantities for each size
         product.size.forEach((quantity) => {
             totalSizeQuantity += quantity;
         });
 
        console.log("Total quantity of all sizes: ", totalSizeQuantity);
        console.log("product :",product);

         // Calculate offers
        const findCategory = product.category;
        const categoryOffer = findCategory ?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        // console.log(product.productImage);


        // Render the product details page
        res.render("productDetails",{
            user:userData,
            product:product,
            totalOffer:totalOffer,
            category:findCategory,
            totalQuantity:totalSizeQuantity,
        });
    } catch (error) {
        console.error('Error for fetching product details',error);
        res.redirect("/pageNotFound");
    }
}

module.exports = {
    productDetails,
}