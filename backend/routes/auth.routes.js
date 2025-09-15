import express from "express";
import { register, login, logout, me , updateMe, changePassword} from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authRequired, me);
router.put("/me", authRequired, updateMe);                    
router.post("/change-password", authRequired, changePassword); 


export default router;
