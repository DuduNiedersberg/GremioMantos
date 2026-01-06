-- =============================================================================
-- Migration 006: Add status column to trocas table for soft-cancel
-- =============================================================================
-- This migration adds a status column to support cancellation of trades
-- without hard deletes, preserving audit trail.
-- =============================================================================

-- Check if status column exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.trocas') 
    AND name = 'status'
)
BEGIN
    ALTER TABLE dbo.trocas
    ADD status VARCHAR(20) NOT NULL DEFAULT 'ativa' 
        CHECK (status IN ('ativa', 'cancelada'));
    
    PRINT 'Column status added to dbo.trocas successfully';
END
ELSE
BEGIN
    PRINT 'Column status already exists in dbo.trocas, skipping';
END;
GO

-- Check if cancelada_em column exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.trocas') 
    AND name = 'cancelada_em'
)
BEGIN
    ALTER TABLE dbo.trocas
    ADD cancelada_em DATETIME2 NULL;
    
    PRINT 'Column cancelada_em added to dbo.trocas successfully';
END
ELSE
BEGIN
    PRINT 'Column cancelada_em already exists in dbo.trocas, skipping';
END;
GO

-- Add index for status queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE object_id = OBJECT_ID('dbo.trocas') 
    AND name = 'idx_trocas_status'
)
BEGIN
    CREATE INDEX idx_trocas_status ON dbo.trocas(status);
    PRINT 'Index idx_trocas_status created successfully';
END
ELSE
BEGIN
    PRINT 'Index idx_trocas_status already exists, skipping';
END;
GO
