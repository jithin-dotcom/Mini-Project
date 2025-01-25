// utils/helper.js

const Product = require("../models/productSchema");

const addToList = async (list, productId, quantity, price, size, userId) => {
    const quantityNum = Number(quantity);

    if (quantityNum <= 0) {

        // return res.status(400).json({
        //     status: false,
        //     message: "Quantity must be greater than 0."
        // });
    
        throw new Error("Quantity must be greater than 0.");
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new Error("Product not found.");
    }

    const availableQuantity = product.size.get(size);
    if (availableQuantity === undefined) {
        // return res.status(400).json({
        //         status: false,
        //         message: "Selected size not available."
        //     });


        throw new Error("Please select a size .");
    }

    const existingProductIndex = list.items.findIndex(item => item.productId.toString() === productId && item.size === size);
    let newQuantity;

    if (existingProductIndex !== -1) {
        newQuantity = list.items[existingProductIndex].quantity + quantityNum;

        if (newQuantity > Math.min(10, availableQuantity)) {
            // return res.status(400).json({
            //     status: false,
            //     message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size. You already have ${cart.items[existingProductIndex].quantity} in your cart.`
            // });


            throw new Error(`You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size. You already have ${list.items[existingProductIndex].quantity} in your list.`);
        }

        list.items[existingProductIndex].quantity = newQuantity;
    } else {
        if (quantityNum > Math.min(10, availableQuantity)) {
            // return res.status(400).json({
            //     status: false,
            //     message: `You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size.`
            // });
            throw new Error(`You can add a maximum of ${Math.min(10, availableQuantity)} items for the selected size.`);
        }

        list.items.push({
            productId,
            name: product.productName,
            quantity: quantityNum,
            price,
            size,
            maxStock: availableQuantity
        });
    }

    list.totalPrice = list.items.reduce((total, item) => total + item.price * item.quantity, 0);
    
    await list.save();
    return list;
};

module.exports = {
     addToList
};
