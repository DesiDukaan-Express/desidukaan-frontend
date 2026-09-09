import { request } from './api';

export const productReviewsAPI = {
  getForProduct: (productId, token) =>
    request("GET", `/product-reviews/product/${productId}`, null, token || null),

  getBulk: (productIds, token, orderId) => {
    const ids = Array.isArray(productIds) ? productIds.join(',') : productIds;
    const orderParam = orderId ? `&order_id=${orderId}` : '';
    return request("GET", `/product-reviews/bulk?productIds=${ids}${orderParam}`, null, token || null);
  },

  submitReview: (productId, rating, token, comment) =>
    request("POST", "/product-reviews", { product_id: productId, rating, ...(comment !== undefined && { comment }) }, token),

  submitBulk: (ratings, token) =>
    request("POST", "/product-reviews/bulk", { ratings }, token),
};
