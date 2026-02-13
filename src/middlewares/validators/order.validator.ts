import { body } from 'express-validator';
import { validateRequest } from './index';

export const createOrderValidator = [
    body('sessionId')
        .optional()
        .isString()
        .withMessage('sessionId must be a string'),

    body('shippingAddress')
        .notEmpty()
        .withMessage('shippingAddress is required'),
    body('shippingAddress.name')
        .notEmpty()
        .isString()
        .withMessage('shippingAddress.name is required'),
    body('shippingAddress.phone')
        .notEmpty()
        .isString()
        .withMessage('shippingAddress.phone is required'),
    body('shippingAddress.addressLine1')
        .notEmpty()
        .isString()
        .withMessage('shippingAddress.addressLine1 is required'),
    body('shippingAddress.city')
        .notEmpty()
        .isString()
        .withMessage('shippingAddress.city is required'),
    body('shippingAddress.state')
        .notEmpty()
        .isString()
        .withMessage('shippingAddress.state is required'),
    body('shippingAddress.pincode')
        .notEmpty()
        .isString()
        .withMessage('shippingAddress.pincode is required'),

    body('guestInfo.name')
        .optional()
        .isString()
        .withMessage('guestInfo.name must be a string'),
    body('guestInfo.email')
        .optional()
        .isEmail()
        .withMessage('guestInfo.email must be a valid email'),
    body('guestInfo.phone')
        .optional()
        .isString()
        .withMessage('guestInfo.phone must be a string'),

    ...validateRequest,
];
