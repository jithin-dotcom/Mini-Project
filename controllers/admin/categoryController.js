

import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const [categoryData, totalCategories] = await Promise.all([
            Category.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Category.countDocuments()
        ]);

        const totalPages = Math.ceil(totalCategories / limit);
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error("Error in categoryInfo:", error);
        res.redirect("/pageerror");
    }
};

const categoryInfoAjax = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const [categoryData, totalCategories] = await Promise.all([
            Category.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Category.countDocuments()
        ]);

        const totalPages = Math.ceil(totalCategories / limit);
        res.json({
            success: true,
            categories: categoryData,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Error fetching category info for AJAX:", error);
        res.status(500).json({ success: false, message: "Error fetching categories" });
    }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        console.log(`Adding category: ${name}`);
        const lowercaseCategoryName = name.trim().toLowerCase();
        const existingCategory = await Category.findOne({ name: lowercaseCategoryName });
        if (existingCategory) {
            console.log(`Category already exists: ${name}`);
            return res.status(400).json({ success: false, message: "Category already exists" });
        }
        const newCategory = new Category({
            name,
            description,
        });
        await newCategory.save();
        console.log(`Category added: ${name}`);
        return res.json({ success: true, message: "Category added successfully" });
    } catch (error) {
        console.error("Error in addCategory:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        console.log(`Adding offer for category ${categoryId}: ${percentage}%`);
        const category = await Category.findById(categoryId);
        if (!category) {
            console.log(`Category not found: ${categoryId}`);
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        if (percentage >= 100 || percentage < 0) {
            console.log(`Invalid percentage: ${percentage}`);
            return res.status(400).json({ success: false, message: "Percentage should be between 0 and 100" });
        }
        const Products = await Product.find({ category: category._id });
        const hasLowerProductOffer = Products.some((product) => product.productOffer < percentage);
        
        if (Products.length > 0 && !hasLowerProductOffer) {
            console.log(`No products have lower offer than ${percentage}%`);
            return res.json({ success: false, message: "None of the products have a lower offer than the category offer. Category offer will not be applied." });
        }
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
        for (const product of Products) {
            if (product.productOffer < percentage) {
                product.productOffer = percentage;
                product.salePrice = product.regularPrice * (1 - (percentage / 100)); 
                await product.save();
            }
        }
        console.log(`Offer added for category ${categoryId}`);
        res.json({ success: true, message: "Offer added successfully" });
    } catch (error) {
        console.error("Error in addCategoryOffer:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        console.log(`Removing offer for category ${categoryId}`);
        const category = await Category.findById(categoryId);
        if (!category) {
            console.log(`Category not found: ${categoryId}`);
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        
        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });
        if (products.length > 0) {
            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        console.log(`Offer removed for category ${categoryId}`);
        res.json({ success: true, message: "Offer removed successfully" });
    } catch (error) {
        console.error("Error in removeCategoryOffer:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const listCategory = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }
        const category = await Category.findByIdAndUpdate(
            id,
            { $set: { isListed: true } },
            { new: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Error listing category:", error);
        res.status(500).json({ success: false, message: "Error listing category" });
    }
};

const unlistCategory = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }
        const category = await Category.findByIdAndUpdate(
            id,
            { $set: { isListed: false } },
            { new: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Error unlisting category:", error);
        res.status(500).json({ success: false, message: "Error unlisting category" });
    }
};

const getListCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({ _id: id });
        if (!category) { 
            return res.status(404).send("Category not found");
        }
        res.render("editCategory", { category });
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;
        const existingCategory = await Category.findOne({ name: categoryName, _id: { $ne: id } });
        if (existingCategory) {
            return res.status(400).json({ error: "Category exists, please choose another name" });
        }
        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });
        if (updateCategory) {
            res.redirect("/admin/category");
        } else {
            res.status(400).json({ error: "Category not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

const categoryController = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    categoryInfoAjax,
    listCategory,
    unlistCategory,
};

export default categoryController;
