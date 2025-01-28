const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");
const Cart = require("../../models/cartSchema");
const { addToList } = require("../../helpers/listController");









const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId);

        // Find the wishlist associated with the user and populate product details
        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId', // Populate the product details                    
            select: 'productName salePrice description productImage size' // Select the fields you want
        }).exec(); // Make sure to call exec()

        console.log(JSON.stringify(wishlist, null, 2));

        if (!wishlist) {
            return res.render("wishlist", {
                user: null,
                wishlist: null,
                message: "Your wishlist is empty!"
            });
        }

        // Loop through the wishlist items and check for stock
        const updatedItems = wishlist.items.filter(item => {
            const product = item.productId; // Product details from populate
            const availableStock = product.size.get(item.size); // Check the stock for the selected size

            // If the stock for the selected size is less than the quantity in the wishlist, remove the item
            return availableStock >= item.quantity;
        });

        // If there are items removed (i.e., stock for size is less than quantity), update the wishlist
        if (updatedItems.length !== wishlist.items.length) {
            wishlist.items = updatedItems;  // Update the wishlist items list
            await wishlist.save();  // Save the updated wishlist
        }

        // Pass the updated wishlist data to the view
        res.render("wishlist", {
            user: await User.findById(userId),
            wishlist: wishlist.items, // Pass the updated items in the wishlist
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

        // Use the helper function to add the item to the wishlist
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
            // message: "An error occurred while adding the product to the wishlist.",
        });
    }
};




const removeProduct = async (req, res) => {
    try {
        const userId = req.session.user;  // Get the user ID from the session
        const productId = req.params.productId;  // Get the productId from the URL parameter
        const size = req.body.size;  // Get the size from the request body
        // console.log("size",size);

        // Find the user's wishlist
        let wishlist = await Wishlist.findOne({ userId });


        if (!wishlist) {
            return res.status(404).json({ status: false, message: 'Wishlist not found' });
        }

        // Remove the product from the  wishlist's items array
        wishlist.items = wishlist.items.filter(item => !(item.productId.toString() === productId  && item.size === size));

        // Save the updated cart
        await wishlist.save();

        // Respond with a success message
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

        // Check if the quantity is greater than 0
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

        // Remove the item from the wishlist
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


