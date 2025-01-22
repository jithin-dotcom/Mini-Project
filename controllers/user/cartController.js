const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");






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









// const getCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         // console.log("User ID:", userId);

//         // Find the cart associated with the user and populate product details
//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId', // Populate the product details
//             select: 'productName salePrice description productImage size ' // Select relevant fields, including size info
//         }).exec();

//         if (!cart) {
//             return res.render("cart", {
//                 user: null,
//                 cart: null,
//                 message: "Your cart is empty!"
//             });
//         }

//         // Filter out items where the stock for the specific size is zero or less
//         const updatedItems = cart.items.filter(item => {
//             const product = item.productId; // Product details from populate
//             const productSizeStock = product.size.get(item.size); // Get stock from the Map using the selected size

//             // If the stock for the selected size is zero or less, return false (removes the item)
//             return productSizeStock > 0;
//         });

//         // If there are items removed (i.e., stock for size is zero), update the cart
//         if (updatedItems.length !== cart.items.length) {
//             cart.items = updatedItems;  // Update the cart items list
//             await cart.save();  // Save the updated cart
//         }

//         // Calculate the total price of the items in the cart
//         let totalPrice = 0;
//         cart.items.forEach(item => {
//             totalPrice += item.price * item.quantity; // price * quantity for each item
//         });

//         console.log("Cart : ",cart);
        

//         // If the cart exists, pass the cart data to the view
//         res.render("cart", {
//             user: await User.findById(userId),
//             cart: cart.items, // Pass the items in the cart
//             totalPrice: totalPrice // Pass the total price to the view
//         });

//     } catch (error) {
//         console.error('Error fetching cart details:', error);
//         res.redirect("/pageNotFound");
//     }
// };








//get cart new


// const getCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         console.log(userId);
//         // Find the cart associated with the user
//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId',  // Populate the product details                    
//             select: 'productName salePrice description productImage size' // Select the fields you want
//         })
//         .exec(); 


//         // console.log(JSON.stringify(cart, null, 2));


//         if (!cart) {
//             return res.render("cart", {
//                 user: null,
//                 cart: null,
//                 message: "Your cart is empty!"
//             });
//         }

//          // Calculate the total price of the items in the cart
//          let totalPrice = 0;
//          cart.items.forEach(item => {
//              totalPrice += item.price * item.quantity; // price * quantity for each item
//          });

        
        

//         // If the cart exists, pass the cart data to the view
//         res.render("cart", {
//             user: await User.findById(userId),
//             cart: cart.items, // Pass the items in the cart
//             totalPrice: totalPrice, // Pass the total price to the view
//         });


       
//     } catch (error) {
//         console.error('Error for fetching cart details', error);
//         res.redirect("/pageNotFound");
//     }
// };




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
                maxStock: availableQuantity,
                status: "Placed",
                cancellationReason: "none"
            });
        }

        cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

        await cart.save();

        const user = await User.findById(userId);
        if (!user.cart.includes(cart._id)) {
            user.cart.push(cart._id);
            await user.save();
        }

        return res.status(200).json({ status: true, message: "Product added to cart" });
    } catch (error) {
        console.error('Error adding product to cart', error);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while adding the product to the cart.'
        });
    }
};



//addto cart latest

// const addToCart = async (req, res) => {
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

//         // Check if the quantity exceeds the limit (10)
//         if (quantityNum > 10) {
//             return res.status(400).json({
//                 status: false,
//                 message: "You can add a maximum of 10 quantities per product."
//             });
//         }

//         // Fetch the product to get the available quantity for the size
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: "Product not found." });
//         }

//         const availableQuantity = product.size.get(size);
//         if (availableQuantity === undefined || availableQuantity < quantityNum) {
//             return res.status(400).json({
//                 status: false,
//                 message: `Only ${availableQuantity || 0} items available for the selected size.`
//             });
//         }

//         // Find the user's cart or create one if it doesn't exist
//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             cart = new Cart({
//                 userId,
//                 items: [{
//                     productId,
//                     quantity: quantityNum,
//                     name: product.productName,
//                     price,
//                     size,
//                     maxStock: availableQuantity, // Store the max stock
//                     status: "Placed",
//                     cancellationReason: "none"
//                 }]
//             });
//         } else {
//             // Check if the product is already in the cart
//             const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

//             if (existingProductIndex !== -1) {
//                 // Calculate the new quantity
//                 const newQuantity = cart.items[existingProductIndex].quantity + quantityNum;

//                 // Check if the new quantity exceeds the available quantity
//                 if (newQuantity > availableQuantity) {
//                     return res.status(400).json({
//                         status: false,
//                         message: `Only ${availableQuantity} items available for the selected size. You already have ${cart.items[existingProductIndex].quantity} in your cart.`
//                     });
//                 }

//                 // Update the quantity
//                 cart.items[existingProductIndex].quantity = newQuantity;
//             } else {
//                 // If the product doesn't exist, add it to the cart
//                 cart.items.push({
//                     productId,
//                     quantity: quantityNum,
//                     name: product.productName,
//                     price,
//                     size,
//                     maxStock: availableQuantity, // Store the max stock
//                     status: "Placed",
//                     cancellationReason: "none"
//                 });
//             }
//         }

//         // Calculate and update the total price
//         cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

//         await cart.save(); // Save the updated cart

        
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