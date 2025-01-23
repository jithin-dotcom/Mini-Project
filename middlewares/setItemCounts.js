const Cart = require('../models/cartSchema'); 
const Wishlist = require("../models/wishlistSchema");

const setItemCounts = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userId = req.session.user._id;

            // Fetch cart item count
            const cart = await Cart.findOne({ userId });
            res.locals.cartItemCount = cart ? cart.items.length : 0;

            // Fetch wishlist item count
            const wishlist = await Wishlist.findOne({ userId });
            res.locals.wishlistItemCount = wishlist ? wishlist.items.length : 0;
        } else {
            res.locals.cartItemCount = 0;
            res.locals.wishlistItemCount = 0;
        }
    } catch (error) {
        console.error("Error fetching item counts:", error);
        res.locals.cartItemCount = 0;
        res.locals.wishlistItemCount = 0;
    }
    next();
};

module.exports = setItemCounts;