package service

import "errors"

var (
	ErrItemRenameInvalidName   = errors.New("item name is required")
	ErrItemRenameSourceMissing = errors.New("item source folder does not exist")
	ErrItemRenameTargetExists  = errors.New("item target folder already exists")
)