import { Router } from "express";
import { PageController } from "../controllers/page.controller";

const router = Router();

// Page operations
router.patch("/:id", PageController.updatePage);
router.put("/:id/columns", PageController.saveColumns);
router.patch("/:id/layout", PageController.setLayout);

// Entry operations
router.patch("/entries/:entryId", PageController.updateEntry);
router.patch("/arrange-entries", PageController.arrangeEntries);

// Image operations
router.post("/:id/upload", PageController.uploadImage);

export default router;
