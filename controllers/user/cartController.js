const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const { addToList } = require("../../helpers/listController");






const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        // console.log("User ID:", userId);

        // Find the cart associated with the user and populate product details
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId', // Populate the product details
            select: 'productName salePrice description productImage size ' // Select relevant fields, including size info
        }).exec();

        if (!cart) {
            return res.render("cart", {
                user: null,
                cart: null,
                message: "Your cart is empty!"
            });
        }

        // Filter out items where the stock for the specific size is less than the quantity in the cart
        const updatedItems = cart.items.filter(item => {
            const product = item.productId; // Product details from populate
            const productSizeStock = product.size.get(item.size); // Get stock from the Map using the selected size

            // If the stock for the selected size is less than the quantity in the cart, remove the item
            return productSizeStock >= item.quantity;
        });



        // If there are items removed (i.e., stock for size is less than quantity), update the cart
        if (updatedItems.length !== cart.items.length) {
            cart.items = updatedItems;  // Update the cart items list
            await cart.save();  // Save the updated cart
        }

        // Calculate the total price of the items in the cart
        let totalPrice = 0;
        cart.items.forEach(item => {
            totalPrice += item.price * item.quantity; // price * quantity for each item
           
        });
        //updating total price in cart new code wishlist-cart
        cart.totalPrice = totalPrice;
        await cart.save();

        console.log("Cart : ",cart);
        
        // If the cart exists, pass the cart data to the view
        res.render("cart", {
            user: await User.findById(userId),
            cart: cart.items, // Pass the items in the cart
            totalPrice: totalPrice // Pass the total price to the view
        });

    } catch (error) {
        console.error('Error fetching cart details:', error);
        res.redirect("/pageNotFound");
    }
};




//add to cart helper 
const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, quantity, price, size } = req.body;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
            });
        }

        // Use the helper function to add the item to the cart
        cart = await addToList(cart, productId, quantity, price, size, userId);

        const user = await User.findById(userId);
        if (!user.cart.includes(cart._id)) {
            user.cart.push(cart._id);
            await user.save();
        }

        return res.status(200).json({ status: true, message: "Product added to cart" });
    } catch (error) {
        console.error("Error adding product to cart", error);
        return res.status(500).json({
            status: false,
            message:  error.message || "Failed to add product to cart.",
        });
    }
};





const removeProduct = async (req, res) => {
    try {
        const userId = req.session.user;  
        const productId = req.params.productId;  
        const size = req.body.size;  
        // console.log("size",size);

        // Find the user's cart
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ status: false, message: 'Cart not found' });
        }

        // Remove the product from the cart's items array
        cart.items = cart.items.filter(item => !(item.productId.toString() === productId  && item.size === size));


         // Calculate and update the total price
         cart.totalPrice = Math.abs(cart.items.reduce((total, item) => total - item.price * item.quantity, 0));

        
        // Save the updated cart
        await cart.save();

        // Respond with a success message
        res.status(200).json({ status: true, message: 'Product removed from cart' });
    } catch (error) {
        console.error('Error removing product from cart', error);
        res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
    }
};








const updateProductQuantity = async (req, res) => {
    try {
        const userId = req.session.user; // Get the user ID from the session
        const productId = req.params.productId; // Get the productId from the URL parameter
        const { size, quantity } = req.body; // Get the size and quantity from the request body

        // Ensure the quantity does not exceed 10
        if (quantity > 10) {
            return res.status(400).json({ status: false, message: 'Quantity cannot exceed 10' });
        }

        // Find the product to check available quantity for the given size
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        // Check if the size exists in the product (ensure size data is a Map or object with valid sizes)
        if (!product.size || !product.size.has(size)) {
            return res.status(404).json({ status: false, message: `Size ${size} not available for this product` });
        }

        const availableQuantity = product.size.get(size);
        if (quantity > availableQuantity) {
            return res.status(400).json({ status: false, message: `Only ${availableQuantity} items available for size ${size}` });
        }

        // Find the user's cart
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ status: false, message: 'Cart not found' });
        }

        // Find the product in the cart
        let productInCart = cart.items.find(item => item.productId.toString() === productId && item.size === size);
        if (productInCart) {
            // Update the quantity in the cart
            productInCart.quantity = quantity;
        } else {
            // If product is not in cart, add it
            cart.items.push({
                productId: productId,
                quantity: quantity,
                price: product.price,
                size: size,
                name: product.name // Assuming you want to store product name as well
            });
        }

        // Recalculate the totalPrice
        let totalPrice = 0;
        cart.items.forEach(item => {
            totalPrice += item.price * item.quantity; // Price is fetched from the cart item itself
        });

        // Update the totalPrice in the cart
        cart.totalPrice = totalPrice;

        // Save the updated cart
        await cart.save();

        // Respond with a success message
        res.status(200).json({ status: true, message: 'Quantity updated and total price recalculated' });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
    }
};

















module.exports = {
    getCart,
    addToCart,
    removeProduct,
    updateProductQuantity,
    
}



































































































































// addto cart before helper  
// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity, price, size } = req.body;
//         const quantityNum = Number(quantity);

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

//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             cart = new Cart({
//                 userId,
//                 items: []
//             });
//         }

//         const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
//         let newQuantity;

//         if (existingProductIndex !== -1) {
//             newQuantity = cart.items[existingProductIndex].quantity + quantityNum;

//             if (newQuantity > Math.min(10, availableQuantity)) {
//                 return res.status(400).json({
//                     status: false,
//                     message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size. You already have ${cart.items[existingProductIndex].quantity} in your cart.`
//                 });
//             }

//             cart.items[existingProductIndex].quantity = newQuantity;
//         } else {
//             if (quantityNum > Math.min(10, availableQuantity)) {
//                 return res.status(400).json({
//                     status: false,
//                     message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size.`
//                 });
//             }

//             cart.items.push({
//                 productId,
//                 quantity: quantityNum,
//                 name: product.productName,
//                 price,
//                 size,
//                 maxStock: availableQuantity,
//                 status: "Placed",
//                 cancellationReason: "none"
//             });
//         }

//         cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

//         await cart.save();

//         const user = await User.findById(userId);
//         if (!user.cart.includes(cart._id)) {
//             user.cart.push(cart._id);
//             await user.save();
//         }

//         return res.status(200).json({ status: true, message: "Product added to cart" });
//     } catch (error) {
//         console.error('Error adding product to cart', error);
//         return res.status(500).json({
//             status: false,
//             message: 'An error occurred while adding the product to the cart.'
//         });
//     }
// };