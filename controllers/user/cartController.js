const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const { addToList } = require("../../helpers/listController");
const Brand = require("../../models/brandSchema");






const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        
         const blockedBrands = await Brand.find({ isBlocked: true }).select('brandName');
         const blockedBrandNames = blockedBrands.map(brand => brand.brandName); 
        
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName salePrice description productImage size isBlocked category brand', 
            populate: {
                path: 'category', 
                select: 'isListed' 
            }
        }).exec();

        if (!cart) {
            return res.render("cart", {
                user: null,
                cart: null,
                message: "Your cart is empty!"
            });
        }

      
        const updatedItems = cart.items.filter(item => {
            const product = item.productId;
            if (!product || !product.category) return false; 
            
            const productSizeStock = product.size.get(item.size); 
            const isCategoryListed = product.category.isListed; 
            const isBrandBlocked = blockedBrandNames.includes(product.brand); 

            return !product.isBlocked && isCategoryListed && !isBrandBlocked && productSizeStock >= item.quantity;
        });


        if (updatedItems.length !== cart.items.length) {
            cart.items = updatedItems;  
            await cart.save();  
        }

        let totalPrice = 0;

        if (cart.items.length > 0) {
           cart.items.forEach(item => {
           totalPrice += item.price * item.quantity; 
           });
        }else {
            totalPrice = 0; 
        }

        for (const item of cart.items) {
            const product = await Product.findOne({ _id: item.productId });
            if (!product) continue;
            item.maxStock = product.size.get(item.size); 
            await cart.save();

        }

        cart.totalPrice = totalPrice;
        await cart.save();

        res.render("cart", {
            user: await User.findById(userId),
            cart: cart.items, 
            totalPrice: totalPrice 
        });

    } catch (error) {
        console.error('Error fetching cart details:', error);
        res.redirect("/pageNotFound");
    }
};





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
        
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ status: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => !(item.productId.toString() === productId  && item.size === size));

         cart.totalPrice = Math.abs(cart.items.reduce((total, item) => total - item.price * item.quantity, 0));

        await cart.save();

        res.status(200).json({ status: true, message: 'Product removed from cart' });
    } catch (error) {
        console.error('Error removing product from cart', error);
        res.status(500).json({ status: false, message: 'An error occurred. Please try again later.' });
    }
};








const updateProductQuantity = async (req, res) => {
    try {
        const userId = req.session.user; 
        const productId = req.params.productId;
        const { size, quantity } = req.body; 

        if (quantity > 10) {
            return res.status(400).json({ status: false, message: 'Quantity cannot exceed 10' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        if (!product.size || !product.size.has(size)) {
            return res.status(404).json({ status: false, message: `Size ${size} not available for this product` });
        }

        const availableQuantity = product.size.get(size);
        if (quantity > availableQuantity) {
            return res.status(400).json({ status: false, message: `Only ${availableQuantity} items available for size ${size}` });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ status: false, message: 'Cart not found' });
        }

        let productInCart = cart.items.find(item => item.productId.toString() === productId && item.size === size);
        if (productInCart) {
            productInCart.quantity = quantity;
        } else {
            cart.items.push({
                productId: productId,
                quantity: quantity,
                price: product.price,
                size: size,
                name: product.name 
            });
        }

        let totalPrice = 0;
        cart.items.forEach(item => {
            totalPrice += item.price * item.quantity; 
        });

        cart.totalPrice = totalPrice;

        await cart.save();

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


































































































































