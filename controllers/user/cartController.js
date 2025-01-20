const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");







// const getCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         console.log(userId);

//         // Find the cart associated with the user using lean for better performance
//         const cart = await Cart.findOne({ userId }).lean();


//         if (!cart) {
//             return res.render("cart", {
//                 user: null,
//                 cart: null,
//                 message: "Your cart is empty!"
//             });
//         }

//         // Fetch the products for each item in the cart
//         const productIds = cart.items.map(item => item.productId);
//         const products = await Product.find({ '_id': { $in: productIds } }).lean();

//         // Merge product details into cart items
//         const updatedItems = cart.items.map(item => {
//             const product = products.find(p => p._id.toString() === item.productId.toString());
//             return {
//                 ...item, // Spread item properties
//                 productDetails: product ? {
//                     name: product.name,
//                     price: product.price,
//                     description: product.description,
//                     image: product.image
//                 } : {}
//             };
//         });
         
        
//         console.log(updatedItems);

//         // Render the view with updated items
//         res.render("cart", {
//             user: await User.findById(userId).lean(), // Using lean here too
//             cart: updatedItems,
//         });

//     } catch (error) {
//         console.error('Error fetching cart details', error);
//         res.redirect("/pageNotFound");
//     }
// };






















//get cart new 

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId);
        // Find the cart associated with the user
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',  // Populate the product details                    
            select: 'productName salePrice description productImage size' // Select the fields you want
        })
        .exec(); // Make sure to call exec()


        // .populate({
        //     path: 'items.size', // You can optionally populate size if it's a reference
        //     select: 'size' // Select the size field if it's a separate model
        // });
        console.log(JSON.stringify(cart, null, 2));


        if (!cart) {
            return res.render("cart", {
                user: null,
                cart: null,
                message: "Your cart is empty!"
            });
        }

         // Calculate the total price of the items in the cart
         let totalPrice = 0;
         cart.items.forEach(item => {
             totalPrice += item.price * item.quantity; // price * quantity for each item
         });

        
        

        // If the cart exists, pass the cart data to the view
        res.render("cart", {
            user: await User.findById(userId),
            cart: cart.items, // Pass the items in the cart
            totalPrice: totalPrice, // Pass the total price to the view
        });


       
    } catch (error) {
        console.error('Error for fetching cart details', error);
        res.redirect("/pageNotFound");
    }
};








//addto cart new latest

// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity, price, size } = req.body;
//         const quantityNum = Number(quantity);


//         // Check if the quantity is greater than 0
//         if (quantityNum <= 0) {
//            return res.status(400).json({
//               status: false,
//               message: "Quantity must be greater than 0."
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
//                     price,
//                     size,
//                     status: "Placed",
//                     cancellationReason: "none"
//                 });
//             }
//         }

//         // Calculate and update the total price
//         cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

//         await cart.save(); // Save the updated cart

//         // Optionally, link the cart to the user
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

        // Check if the quantity exceeds the limit (10)
        if (quantityNum > 10) {
            return res.status(400).json({
                status: false,
                message: "You can add a maximum of 10 quantities per product."
            });
        }

        // Fetch the product to get the available quantity for the size
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found." });
        }

        const availableQuantity = product.size.get(size);
        if (availableQuantity === undefined || availableQuantity < quantityNum) {
            return res.status(400).json({
                status: false,
                message: `Only ${availableQuantity || 0} items available for the selected size.`
            });
        }

        // Find the user's cart or create one if it doesn't exist
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity: quantityNum,
                    name: product.productName,
                    price,
                    size,
                    maxStock: availableQuantity, // Store the max stock
                    status: "Placed",
                    cancellationReason: "none"
                }]
            });
        } else {
            // Check if the product is already in the cart
            const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

            if (existingProductIndex !== -1) {
                // Calculate the new quantity
                const newQuantity = cart.items[existingProductIndex].quantity + quantityNum;

                // Check if the new quantity exceeds the available quantity
                if (newQuantity > availableQuantity) {
                    return res.status(400).json({
                        status: false,
                        message: `Only ${availableQuantity} items available for the selected size. You already have ${cart.items[existingProductIndex].quantity} in your cart.`
                    });
                }

                // Update the quantity
                cart.items[existingProductIndex].quantity = newQuantity;
            } else {
                // If the product doesn't exist, add it to the cart
                cart.items.push({
                    productId,
                    quantity: quantityNum,
                    price,
                    size,
                    maxStock: availableQuantity, // Store the max stock
                    status: "Placed",
                    cancellationReason: "none"
                });
            }
        }

        // Calculate and update the total price
        cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

        await cart.save(); // Save the updated cart

        // Optionally, link the cart to the user
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



















//addto cart with totalprice 

// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity, price, size } = req.body;
//         // req.session.quantity = quantity;
//         // req.session.size = size;

//         const quantityNum = Number(quantity);

//         // Check if quantity exceeds the limit (10)
//         if (quantityNum > 10) {
//             return res.status(400).json({
//                 status: false,
//                 message: "You can add a maximum of 10 quantities per product."
//             });
//         }

//         // Fetch the product to get the name
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: "Product not found." });
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
//                     status: "Placed",
//                     cancellationReason: "none"
//                 }]
//             });
//         } else {
//             // Check if the product is already in the cart
//             const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

//             if (existingProductIndex !== -1) {
//                 // If the product already exists, update the quantity
//                 cart.items[existingProductIndex].quantity += quantityNum;
//             } else {
//                 // If the product doesn't exist, add it to the cart
//                 cart.items.push({
//                     productId,
//                     quantity: quantityNum,
//                     price,
//                     size,
//                     status: "Placed",
//                     cancellationReason: "none"
//                 });
//             }
//         }

//         // Calculate and update the total price
//         cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

//         await cart.save(); // Save the updated cart

//         // Optionally, link the cart to the user
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












//addtocart new without total price

// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity, price, size } = req.body; // Extract details from request body


//         console.log("Received quantity:", quantity); // Log the quantity value
//         console.log("Received productId:", productId); // Log the productId
//         console.log("Received size:", size); // Log the size

        
//         // Convert quantity to a number (just in case it's passed as a string)
//         const quantityNum = Number(quantity);

//          // Check if quantity exceeds the limit (10)
//          if (quantityNum > 10) {
//             return res.status(400).json({
//                 status: false,
//                 message: "You can add a maximum of 10 quantities per product."
//             });
//         }

        
//         // Fetch the product to get the name
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: "Product not found." });
//         }



//         // Find the user's cart or create one if it doesn't exist
//         let cart = await Cart.findOne({ userId });
        
//         // If the user doesn't have a cart, create one
//         if (!cart) {
//             cart = new Cart({
//                 userId,
//                 items: [{
//                     productId,
//                     quantity,
//                     name: product.productName,
//                     price,
//                     size,
//                     status: "Placed",
//                     cancellationReason: "none"
//                 }]
//             });
//             await cart.save(); // Save the new cart
//         } else {
//             // Check if the product is already in the cart
//             const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
            
//             if (existingProductIndex !== -1) {
//                 // If the product already exists, update the quantity
//                 cart.items[existingProductIndex].quantity += Number(quantity);
//             } else {
//                 // If the product doesn't exist, add it to the cart
//                 cart.items.push({
//                     productId,
//                     // quantity,
//                     quantity: Number(quantity),  // Ensure quantity is a number
//                     price,
//                     size,
//                     status: "Placed",
//                     cancellationReason: "none"
//                 });
//             }
//             await cart.save(); // Save the updated cart
//         }



//         // Calculate the total price
//         const totalPrice = cart.items.reduce((total, item) => {
//             return total + item.price * item.quantity;
//         }, 0);

//         // // Store the total price in the session
//         // req.session.totalPrice = totalPrice;



//         // Optionally, link the cart to the user
//         const user = await User.findById(userId);
//         if (!user.cart.includes(cart._id)) {
//             user.cart.push(cart._id);
//             await user.save();
//         }

//         return res.status(200).json({ status: true, message: "Product added to cart" });
//     } catch (error) {
//         console.error('Error for adding product to cart', error);

//         return res.status(500).json({
//             status: false,
//             message: 'An error occurred while adding the product to the cart.'
//         });

//         // res.redirect("/pageNotFound");
//     }
// };












//get cart



// const getCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const user = await User.findById(userId);
//         const product = await Product.find({ _id: { $in: user.cart } }).populate('category');
       
//         res.render("cart",{
//             user:user,
//             cart:product,
//         });


//     } catch (error) {
//         console.error('Error for fetching cart details', error);
//         res.redirect("/pageNotFound");
//     }
// }




//add to cart

// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const productId = req.body.productId;
//         const user = await User.findById(userId);
//         if(user.cart.includes(productId)){
//             return res.status(200).json({status:false,message:"Product already in cart"});
//         }
        
//         user.cart.push(productId);
//         await user.save();
//         return res.status(200).json({status:true,message:"Product added to cart"});



//     }catch (error) {
//         console.error('Error for adding product to cart', error);
//         res.redirect("/pageNotFound");
//     }

// }


// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, sizenow, quantity } = req.body; // Ensure these fields are passed from the frontend
//         const user = await User.findById(userId);

//         // Check if the product with the same size already exists
//         const cartItem = user.cart.find(item => item.productId == productId && item.size == sizenow);

//         if (cartItem) {
//             cartItem.quantity += parseInt(quantity, 10); // Increment quantity
//         } else {
//             user.cart.push({ productId  });
//         }

//         await user.save();
//         return res.status(200).json({ status: true, message: "Product added to cart" });

//     } catch (error) {
//         console.error('Error adding product to cart', error);
//         res.status(500).json({ status: false, message: 'Error adding product to cart' });
//     }
// };




// const removeProduct = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const productId = req.query.productId;
//         const user = await User.findById(userId);
//         const index = user.cart.indexOf(productId);
//         user.cart.splice(index, 1);
//         await user.save();
//         return res.redirect("/cart");

//     } catch (error) {
           
//         console.error('Error for removing product from cart', error);
//         return res.redirect("/pageNotFound");
//     }

// }


// remove product new
const removeProduct = async (req, res) => {
    try {
        const userId = req.session.user;  // Get the user ID from the session
        const productId = req.params.productId;  // Get the productId from the URL parameter
        const size = req.body.size;  // Get the size from the request body
        console.log("size",size);

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

// Route to handle removing a product from the cart
// app.delete('/removeProduct/:productId', removeProduct);




// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity } = req.body;

//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: "Product not found" });
//         }

//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             // If no cart exists, create one
//             cart = new Cart({ userId, items: [] });
//         }

//         // Check if the product is already in the cart
//         const cartItem = cart.items.find(item => item.productId.toString() === productId);

//         if (cartItem) {
//             // Update quantity if the product exists
//             cartItem.quantity += parseInt(quantity, 10);
//         } else {
//             // Add new product to the cart
//             cart.items.push({
//                 productId,
//                 quantity,
//                 price: product.price, // Assuming `price` is a property of the Product schema
//             });
//         }

//         await cart.save();
//         return res.status(200).json({ status: true, message: "Product added to cart" });

//     } catch (error) {
//         console.error('Error adding product to cart:', error);
//         res.status(500).json({ status: false, message: 'Error adding product to cart' });
//     }
// };


// const getCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const cart = await Cart.findOne({ userId }).populate('items.productId');

//         if (!cart) {
//             return res.render("cart", { user: null, cart: [] });
//         }

//         res.render("cart", {
//             user: userId,
//             cart: cart.items,
//         });
//     } catch (error) {
//         console.error('Error fetching cart details:', error);
//         res.redirect("/pageNotFound");
//     }
// };


// const removeProduct = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const productId = req.query.productId;

//         const cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: "Cart not found" });
//         }

//         // Remove the product from the cart
//         cart.items = cart.items.filter(item => item.productId.toString() !== productId);
//         await cart.save();

//         return res.status(200).json({ status: true, message: "Product removed from cart" });

//     } catch (error) {
//         console.error('Error removing product from cart:', error);
//         res.status(500).json({ status: false, message: "Error removing product from cart" });
//     }
// };





//increase quantity cart

// const getCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         console.log(userId);

//         // Find the cart associated with the user
//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId',
//             select: 'productName salePrice description productImage'
//         }).exec();

//         if (!cart) {
//             return res.render("cart", {
//                 user: null,
//                 cart: null,
//                 message: "Your cart is empty!"
//             });
//         }

//         // If the cart exists, pass the cart data to the view
//         res.render("cart", {
//             user: await User.findById(userId),
//             cart: cart.items, // Pass the items in the cart
//         });

//     } catch (error) {
//         console.error('Error for fetching cart details', error);
//         res.redirect("/pageNotFound");
//     }
// };



// const addToCart = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { productId, quantity, price, size } = req.body; // Extract details from request body

//         const quantityNum = Number(quantity);

//         // Check if quantity exceeds the limit (10)
//         if (quantityNum > 10) {
//             return res.status(400).json({
//                 status: false,
//                 message: "You can add a maximum of 10 quantities per product."
//             });
//         }

//         // Fetch the product to get the name
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: "Product not found." });
//         }

//         // Find the user's cart or create one if it doesn't exist
//         let cart = await Cart.findOne({ userId });
        
//         if (!cart) {
//             // If the user doesn't have a cart, create one
//             cart = new Cart({
//                 userId,
//                 items: [{
//                     productId,
//                     quantity: quantityNum,
//                     name: product.productName,
//                     price,
//                     size,
//                     status: "Placed",
//                     cancellationReason: "none"
//                 }]
//             });
//             await cart.save();
//         } else {
//             // If product already exists in the cart, update the quantity
//             const existingProductIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
            
//             if (existingProductIndex !== -1) {
//                 cart.items[existingProductIndex].quantity += quantityNum;
//             } else {
//                 cart.items.push({
//                     productId,
//                     quantity: quantityNum,
//                     price,
//                     size,
//                     status: "Placed",
//                     cancellationReason: "none"
//                 });
//             }
//             await cart.save();
//         }

//         // Link the cart to the user if it's not already
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



// const removeProduct = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const productId = req.params.productId; // Get the productId from the URL parameter
//         const size = req.body.size; // Get the size from the request body

//         // Find the user's cart
//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: 'Cart not found' });
//         }

//         // Remove the product from the cart's items array
//         cart.items = cart.items.filter(item => !(item.productId.toString() === productId && item.size === size));

//         // Save the updated cart
//         await cart.save();

//         // Respond with a success message
//         res.status(200).json({ status: true, message: 'Product removed from cart' });
//     } catch (error) {
//         console.error('Error removing product from cart', error);
//         res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
//     }
// };



//update quantity

// const updateQuantity = async (req, res) => {
//     console.log("req.boby : " ,req.body );
//     try {
//         console.log("req.session : ",req.session);
//         console.log("req.body : ",req.body);
//         const userId = req.session.user;
//         const { productId, quantity, size } = req.body;
        

//         // Find the user's cart
//         const cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: "Cart not found." });
//         }

//         // Find the product in the cart
//         const productIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
        
//         if (productIndex === -1) {
//             return res.status(404).json({ status: false, message: "Product not found in cart." });
//         }

//         // Update the quantity
//         cart.items[productIndex].quantity = Number(quantity);

//         // Check if quantity exceeds the limit
//         if (cart.items[productIndex].quantity > 10) {
//             return res.status(400).json({
//                 status: false,
//                 message: "You can add a maximum of 10 quantities per product."
//             });
//         }

//         // Save the updated cart
//         await cart.save();

//         // Respond with success
//         res.status(200).json({ status: true, message: "Cart updated successfully" });
//     } catch (error) {
//         console.error('Error updating quantity in cart', error);
//         res.status(500).json({ status: false, message: "An error occurred. Please try again later." });
//     }
// };



// const updateProductQuantity = async (req, res) => {
//     try {
//         const userId = req.session.user; // Get the user ID from the session
//         const productId = req.params.productId; // Get the productId from the URL parameter
//         const { size, quantity } = req.body; // Get the size and quantity from the request body

//         // Find the user's cart
//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: 'Cart not found' });
//         }

//         // Update the product quantity in the cart's items array
//         let product = cart.items.find(item => item.productId.toString() === productId && item.size === size);
//         if (product) {
//             product.quantity = quantity;
//         } else {
//             return res.status(404).json({ status: false, message: 'Product not found in cart' });
//         }

//         // Save the updated cart
//         await cart.save();

//         // Respond with a success message
//         res.status(200).json({ status: true, message: 'Quantity updated' });
//     } catch (error) {
//         console.error('Error updating quantity', error);
//         res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
//     }
// };






// const updateProductQuantity = async (req, res) => {
//     try {
//         const userId = req.session.user; // Get the user ID from the session
//         const productId = req.params.productId; // Get the productId from the URL parameter
//         const { size, quantity } = req.body; // Get the size and quantity from the request body
//         console.log("quantity : " , quantity);
//         console.log("size : ",size);

//         // Ensure the quantity does not exceed 10
//         if (quantity > 10) {
//             return res.status(400).json({ status: false, message: 'Quantity cannot exceed 10' });
//         }

//         // Find the user's cart
//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: 'Cart not found' });
//         }

//         // Update the product quantity in the cart's items array
//         let product = cart.items.find(item => item.productId.toString() === productId && item.size === size);
//         if (product) {
//             product.quantity = quantity;
//         } else {
//             return res.status(404).json({ status: false, message: 'Product not found in cart' });
//         }

//         // Save the updated cart
//         await cart.save();

//         // Respond with a success message
//         res.status(200).json({ status: true, message: 'Quantity updated' });
//     } catch (error) {
//         console.error('Error updating quantity', error);
//         res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
//     }
// };








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











// const updateProductQuantity = async (req, res) => {
//     try {
//         const userId = req.session.user; // Get the user ID from the session
//         const productId = req.params.productId; // Get the productId from the URL parameter
//         const { size, quantity } = req.body; // Get the size and quantity from the request body

//         // Ensure the quantity does not exceed 10
//         if (quantity > 10) {
//             return res.status(400).json({ status: false, message: 'Quantity cannot exceed 10' });
//         }

//         // Find the product to check available quantity for the given size
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ status: false, message: 'Product not found' });
//         }

//         // Check if the size exists in the product (ensure size data is a Map or object with valid sizes)
//         if (!product.size || !product.size.has(size)) {
//             return res.status(404).json({ status: false, message: `Size ${size} not available for this product` });
//         }

//         const availableQuantity = product.size.get(size);
//         if (quantity > availableQuantity) {
//             return res.status(400).json({ status: false, message: `Only ${availableQuantity} items available for size ${size}` });
//         }

//         // Find the user's cart
//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: 'Cart not found' });
//         }

//         // Find the product in the cart
//         let productInCart = cart.items.find(item => item.productId.toString() === productId && item.size === size);
//         if (productInCart) {
//             // Update the quantity in the cart
//             productInCart.quantity = quantity;
//         } else {
//             return res.status(404).json({ status: false, message: 'Product not found in cart' });
//         }

//         // Save the updated cart
//         await cart.save();

//         // Respond with a success message
//         res.status(200).json({ status: true, message: 'Quantity updated' });
//     } catch (error) {
//         console.error('Error updating quantity:', error);
//         res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
//     }
// };















// const updateProductQuantity = async (req, res) => {
//     try {
//         const userId = req.session.user; // Get the user ID from the session
//         const productId = req.params.productId; // Get the productId from the URL parameter
//         const { size, quantity } = req.body; // Get the size and quantity from the request body

//         // Ensure the quantity does not exceed 10
//         if (quantity > 10) {
//             return res.status(400).json({ status: false, message: 'Quantity cannot exceed 10' });
//         }

//         // Find the product to check available quantity for the given size
//         const product = await Product.findById(productId);
//         if (!product || !product.size.has(size)) {
//             return res.status(404).json({ status: false, message: 'Product or size not found' });
//         }

//         const availableQuantity = product.size.get(size);
//         if (quantity > availableQuantity) {
//             return res.status(400).json({ status: false, message: `Only ${availableQuantity} items available for size ${size}` });
//         }

//         // Find the user's cart
//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             return res.status(404).json({ status: false, message: 'Cart not found' });
//         }

//         // Update the product quantity in the cart's items array
//         let productInCart = cart.items.find(item => item.productId.toString() === productId && item.size === size);
//         if (productInCart) {
//             productInCart.quantity = quantity;
//         } else {
//             return res.status(404).json({ status: false, message: 'Product not found in cart' });
//         }

//         // Save the updated cart
//         await cart.save();

//         // Respond with a success message
//         res.status(200).json({ status: true, message: 'Quantity updated' });
//     } catch (error) {
//         console.error('Error updating quantity', error);
//         res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
//     }
// };




module.exports = {
    getCart,
    addToCart,
    removeProduct,
    updateProductQuantity,
    // updateQuantity,
}