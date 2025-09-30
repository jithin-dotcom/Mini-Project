import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import User from "../../models/userSchema.js";
import Brand from "../../models/brandSchema.js";


const productDetails = async(req,res)=>{
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
         const brand = await Brand.findOne({ brandName: product.brand });

         let totalSizeQuantity = 0;
         product.size.forEach((quantity) => {
             totalSizeQuantity += quantity;
         });

        if (!product || product.isBlocked||totalSizeQuantity===0|| (brand && brand.isBlocked) || (product.category && !product.category.isListed)) {
            // console.log("Product is blocked, brand is blocked, or category is not listed. Redirecting to shop page.");
            return res.redirect("/shop"); 
        }

        const findCategory = product.category;
        const categoryOffer = findCategory ?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

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


const productController = {
    productDetails,
};

export default productController;