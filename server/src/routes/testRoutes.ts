import { Router } from 'express';
import { db } from '../db/index.js';
import { testTable } from '../db/schemas/testTable.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/v1/test
 * الحصول على جميع السجلات التجريبية
 */
router.get('/', async (req, res) => {
  try {
    const records = await db.select().from(testTable);

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Error fetching test records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test records'
    });
  }
});

/**
 * GET /api/v1/test/:id
 * الحصول على سجل معين بواسطة ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const record = await db.select()
      .from(testTable)
      .where(eq(testTable.id, id));

    if (record.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
      data: record[0]
    });
  } catch (error) {
    console.error('Error fetching test record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test record'
    });
  }
});

/**
 * POST /api/v1/test
 * إنشاء سجل تجريبي جديد
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, quantity, isActive, metadata } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const newRecord = await db.insert(testTable)
      .values({
        name,
        description,
        quantity: quantity || 0,
        isActive: isActive !== undefined ? isActive : true,
        metadata: metadata ? JSON.stringify(metadata) : null
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord[0],
      message: 'Record created successfully'
    });
  } catch (error) {
    console.error('Error creating test record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test record'
    });
  }
});

/**
 * PUT /api/v1/test/:id
 * تحديث سجل تجريبي موجود
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, quantity, isActive, metadata } = req.body;

    // التحقق من وجود السجل
    const existingRecord = await db.select()
      .from(testTable)
      .where(eq(testTable.id, id));

    if (existingRecord.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    const updatedRecord = await db.update(testTable)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(isActive !== undefined && { isActive }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
        updatedAt: new Date()
      })
      .where(eq(testTable.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedRecord[0],
      message: 'Record updated successfully'
    });
  } catch (error) {
    console.error('Error updating test record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update test record'
    });
  }
});

/**
 * DELETE /api/v1/test/:id
 * حذف سجل تجريبي
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // التحقق من وجود السجل
    const existingRecord = await db.select()
      .from(testTable)
      .where(eq(testTable.id, id));

    if (existingRecord.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    await db.delete(testTable)
      .where(eq(testTable.id, id));

    res.json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete test record'
    });
  }
});

export default router;
