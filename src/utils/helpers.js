/**
 * General utility functions
 */

const generateInvoiceNumber = (lastInvoiceNumber = null) => {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);
  
  if (!lastInvoiceNumber) {
    return `INV-${yearSuffix}-0001`;
  }
  
  // Extract number from last invoice (e.g., "INV-23-0005" -> 5)
  const match = lastInvoiceNumber.match(/INV-\d{2}-(\d+)$/);
  if (!match) {
    return `INV-${yearSuffix}-0001`;
  }
  
  const lastNumber = parseInt(match[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
  
  return `INV-${yearSuffix}-${nextNumber}`;
};

const calculateGST = (amount, taxRate, customerState, businessState = 'Maharashtra') => {
  const taxAmount = (amount * taxRate) / 100;
  
  // If customer and business are in same state, apply CGST + SGST
  // If different states, apply IGST
  if (customerState === businessState) {
    return {
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
      totalTax: taxAmount
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      totalTax: taxAmount
    };
  }
};

const validateGSTNumber = (gstNumber) => {
  if (!gstNumber) return true; // GST number is optional
  
  // GST number format: 15 characters
  // First 2: State code
  // Next 10: PAN number
  // 12th: Entity number
  // 13th: Z (default)
  // 14th: Check digit
  // 15th: Check digit
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  return gstRegex.test(gstNumber);
};

const validatePAN = (panNumber) => {
  if (!panNumber) return true; // PAN is optional
  
  // PAN format: ABCDE1234F
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  
  return panRegex.test(panNumber);
};

const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

const calculateDueDate = (invoiceDate, paymentTerms = 30) => {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + paymentTerms);
  return date;
};

const isOverdue = (dueDate) => {
  return new Date() > new Date(dueDate);
};

const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};

module.exports = {
  generateInvoiceNumber,
  calculateGST,
  validateGSTNumber,
  validatePAN,
  formatCurrency,
  calculateDueDate,
  isOverdue,
  sanitizeString,
  generatePassword
};