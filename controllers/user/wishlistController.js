const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema");
const { addToList } = require("../../helpers/listController");
const Brand = require("../../models/brandSchema");









const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId);
        const blockedBrands = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandNames = blockedBrands.map(brand => brand.brandName); 
        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId',                    
            select: 'productName salePrice description productImage size isBlocked category brand',
            populate: { path: 'category', select: 'isListed' } 
        }).exec(); 

        console.log(JSON.stringify(wishlist, null, 2));

        if (!wishlist) {
            return res.render("wishlist", {
                user: null,
                wishlist: null,
                message: "Your wishlist is empty!"
            });
        }

        const updatedItems = wishlist.items.filter(item => {
            const product = item.productId; 
            if (!product || !product.category) return false; 

            const availableStock = product.size.get(item.size); 
            const isCategoryListed = product.category.isListed; 
            const isBrandBlocked = blockedBrandNames.includes(product.brand); 
            return !product.isBlocked  && isCategoryListed && !isBrandBlocked && availableStock >= item.quantity;
           
        });

        if (updatedItems.length !== wishlist.items.length) {
            wishlist.items = updatedItems;  
            await wishlist.save();  
        }

        res.render("wishlist", {
            user: await User.findById(userId),
            wishlist: wishlist.items, 
        });

    } catch (error) {
        console.error('Error for fetching wishlist details', error);
        res.redirect("/pageNotFound");
    }
};






const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, quantity, price, size } = req.body;

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                items: [],
            });
        }

        wishlist = await addToList(wishlist, productId, quantity, price, size, userId);

        const user = await User.findById(userId);
        if (!user.wishlist.includes(wishlist._id)) {
            user.wishlist.push(wishlist._id);
            await user.save();
        }

        return res.status(200).json({ status: true, message: "Product added to wishlist" });
    } catch (error) {
        console.error("Error adding product to wishlist", error);
        return res.status(500).json({
            status: false,
            message:  error.message || "Failed to add product to wishlist.",
        });
    }
};




const removeProduct = async (req, res) => {
    try {
        const userId = req.session.user;  
        const productId = req.params.productId;  
        const size = req.body.size;  
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ status: false, message: 'Wishlist not found' });
        }
        wishlist.items = wishlist.items.filter(item => !(item.productId.toString() === productId  && item.size === size));
        await wishlist.save();
        res.status(200).json({ status: true, message: 'Product removed from wishlist' })
    } catch (error) {
        console.error('Error removing product from wishlist', error);
        res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
    }
};






const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, quantity, price, size } = req.body;
        const quantityNum = Number(quantity);
        if (quantityNum <= 0) {
            return res.status(400).json({
                status: false,
                message: "Quantity must be greater than 0."
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found." });
        }

        const availableQuantity = product.size.get(size);
        if (availableQuantity === undefined) {
            return res.status(400).json({
                status: false,
                message: "Selected size not available."
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
        let newQuantity;

        if (existingProductIndex !== -1) {
            newQuantity = cart.items[existingProductIndex].quantity + quantityNum;

            if (newQuantity > Math.min(10, availableQuantity)) {
                return res.status(400).json({
                    status: false,
                    message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size. You already have ${cart.items[existingProductIndex].quantity} in your cart.`
                });
            }

            cart.items[existingProductIndex].quantity = newQuantity;
        } else {
            if (quantityNum > Math.min(10, availableQuantity)) {
                return res.status(400).json({
                    status: false,
                    message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size.`
                });
            }

            cart.items.push({
                productId,
                quantity: quantityNum,
                name: product.productName,
                price,
                size,
                status: "Placed",
                cancellationReason: "none"
            });
        }

        await cart.save();
        const user = await User.findById(userId);
        if (!user.cart.includes(cart._id)) {
            user.cart.push(cart._id);
            await user.save();
        }
        await Wishlist.updateOne(
            { userId: userId },
            {
                $pull: {
                    items: {
                        productId: productId,
                        size: size
                    }
                }
            }
        );

        return res.status(200).json({ status: true, message: "Product added to cart" });
    } catch (error) {
        console.error('Error adding product to cart', error);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while adding the product to the cart.'
        });
    }
};





module.exports = {
    loadWishlist,
    addToWishlist,
    removeProduct,
    addToCart,
}






















































































































































//add to wishlist before helper

// const addToWishlist = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity, price, size } = req.body;

//         const quantityNum = Number(quantity);

//         // Check if the quantity is greater than 0
//         if (quantityNum <= 0) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Quantity must be greater than 0."
//             });
//         }

//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: "Product not found." });
//         }

//         const availableQuantity = product.size.get(size);
//         if (availableQuantity === undefined) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Selected size not available."
//             });
//         }

//         let wishlist = await Wishlist.findOne({ userId });

//         if (!wishlist) {
//             wishlist = new Wishlist({
//                 userId,
//                 items: []
//             });
//         }

//         const existingProductIndex = wishlist.items.findIndex(item => item.productId.toString() === productId && item.size === size);
//         let newQuantity;

//         if (existingProductIndex !== -1) {
//             newQuantity = wishlist.items[existingProductIndex].quantity + quantityNum;

//             if (newQuantity > Math.min(10, availableQuantity)) {
//                 return res.status(400).json({
//                     status: false,
//                     message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size. You already have ${wishlist.items[existingProductIndex].quantity} in your wishlist.`
//                 });
//             }

//             wishlist.items[existingProductIndex].quantity = newQuantity;
//         } else {
//             if (quantityNum > Math.min(10, availableQuantity)) {
//                 return res.status(400).json({
//                     status: false,
//                     message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size.`
//                 });
//             }

//             wishlist.items.push({
//                 productId,
//                 name: product.productName,
//                 quantity: quantityNum,
//                 price,
//                 size,
//                 maxStock: availableQuantity
//             });
//         }

//         await wishlist.save();

//         const user = await User.findById(userId);
//         if (!user.wishlist.includes(wishlist._id)) {
//             user.wishlist.push(wishlist._id);
//             await user.save();
//         }

//         return res.status(200).json({ status: true, message: "Product added to wishlist" });
//     } catch (error) {
//         console.error('Error adding product to wishlist', error);
//         return res.status(500).json({
//             status: false,
//             message: 'An error occurred while adding the product to the wishlist.'
//         });
//     }
// };


