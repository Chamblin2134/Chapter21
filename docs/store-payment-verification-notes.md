# Store Payment Verification Notes

## 2026-09-05 Temporary Campaign Check

Production had no existing promotion campaigns. A temporary campaign named `Temporary Store Payment Verification 20260905` was activated solely to validate the requested all-PDF pricing behavior and will be removed after testing.

The public Store loaded the campaign dialog and a non-null `window.AveryStorePromotionState`. The published resource **Coping Skills: From Reaction to Direction** has a server catalog price of **$2.99**. Its rendered public Store card displayed the original price, the discounted **$2.69** price, and `10% off`, confirming the client-side campaign presentation rounds the 10% discount correctly.
