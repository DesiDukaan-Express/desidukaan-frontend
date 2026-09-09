import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { productReviewsAPI } from "../services/productReviews";
import useAuthStore from "../store/authStore";

const STAR_COLOR = "#F59E0B";
const STAR_EMPTY_COLOR = "#D1D5DB";

/**
 * ProductStarRating — displays average star rating for a product.
 *
 * Props:
 *   productId   {number}  — required
 *   compact     {boolean} — smaller layout for ProductCard (default false)
 *   avgRating   {number}  — pre-fetched avg rating (skips individual API call)
 *   totalReviews {number} — pre-fetched review count
 *   myRating    {number}  — pre-fetched customer's own rating
 *   myComment   {string}  — pre-fetched customer's own comment
 *   canRate     {boolean} — pre-fetched flag: customer has received this product
 *   comments    {array}   — pre-fetched text comments [{ rating, comment, customer_name, created_at }]
 *   onRated     {func}   — callback after successful rating submission
 */
export default function ProductStarRating({
  productId,
  compact = false,
  avgRating: propAvg,
  totalReviews: propTotal,
  myRating: propMy,
  myComment: propMyComment,
  canRate: propCanRate,
  comments: propComments,
  onRated,
}) {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const activeRole = useAuthStore((s) => s.activeRole);

  const hasProps = propAvg !== undefined || propTotal !== undefined;

  const [avgRating, setAvgRating] = useState(propAvg ?? null);
  const [totalReviews, setTotalReviews] = useState(propTotal ?? 0);
  const [myRating, setMyRating] = useState(propMy ?? null);
  const [myComment, setMyComment] = useState(propMyComment ?? null);
  const [canRate, setCanRate] = useState(propCanRate ?? false);
  const [comments, setComments] = useState(propComments ?? []);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(!hasProps);
  const [submitting, setSubmitting] = useState(false);


  // Sync state when props change (e.g. bulk data arrives after initial render)
  useEffect(() => {
    if (propAvg !== undefined) setAvgRating(propAvg);
    if (propTotal !== undefined) setTotalReviews(propTotal);
    if (propMy !== undefined) setMyRating(propMy);
    if (propMyComment !== undefined) setMyComment(propMyComment);
    if (propCanRate !== undefined) setCanRate(propCanRate);
    if (propComments !== undefined) setComments(propComments);
    if (hasProps) setLoading(false);
  }, [propAvg, propTotal, propMy, propMyComment, propCanRate, propComments, hasProps]);

  // Only fetch individually if no pre-fetched props were provided
  const fetchReviews = useCallback(async () => {
    if (!productId || hasProps) return;
    try {
      setLoading(true);
      const res = await productReviewsAPI.getForProduct(productId, token);
      if (res.success) {
        setAvgRating(res.data.avgRating);
        setTotalReviews(res.data.totalReviews);
        setMyRating(res.data.myRating);
        setMyComment(res.data.myComment);
        setCanRate(res.data.canRate);
        setComments(res.data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load product reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [productId, token, hasProps]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleRate = async (rating) => {
    if (!token || activeRole !== "customer") {
      Alert.alert(
        t("vendorStore.loginRequired") || "Login required",
        t("vendorStore.loginToRate") || "Please log in as a customer to rate this product."
      );
      return;
    }
    if (submitting) return;

    try {
      setSubmitting(true);
      const res = await productReviewsAPI.submitReview(productId, rating, token, commentText);
      if (res.success) {
        setMyRating(rating);
        if (commentText) setMyComment(commentText);
        setAvgRating(res.data.avgRating);
        setTotalReviews(res.data.totalReviews);
        // Re-fetch to get accurate data (updated avg, other comments)
        fetchReviews();
        onRated?.(res.data);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, compact && styles.loadingWrapCompact]}>
        <ActivityIndicator size="small" color={STAR_COLOR} />
      </View>
    );
  }

  // In compact mode: hide if no reviews and no way to rate
  // In full mode (modal): always show so total review count is visible
  if (compact && totalReviews === 0 && !canRate) return null;

  const displayRating = avgRating ?? myRating ?? 0;
  const starSize = compact ? 14 : 18;

  const renderStar = (index) => {
    const filled = index < Math.floor(displayRating);
    const half = !filled && index < displayRating;
    return (
      <MaterialIcons
        key={index}
        name={filled ? "star" : half ? "star-half" : "star-outline"}
        size={starSize}
        color={filled || half ? STAR_COLOR : STAR_EMPTY_COLOR}
      />
    );
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {canRate && activeRole === "customer" ? (
        <View style={compact ? styles.readOnlyRow : styles.interactiveRow}>
          {/* Show average rating with half-star support above the picker */}
          {!compact && avgRating != null && totalReviews > 0 && (
            <View style={styles.avgRow}>
              <View style={styles.starsRow}>
                {[0, 1, 2, 3, 4].map(renderStar)}
              </View>
              <Text style={styles.ratingText}>{avgRating} ({totalReviews})</Text>
            </View>
          )}
          {!compact && (
            <Text style={styles.labelText}>
              {myRating
                ? (t("vendorStore.yourRating") || "Your rating")
                : (t("vendorStore.rateProduct") || "Rate this product")}
            </Text>
          )}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRate(star)}
                disabled={submitting}
                style={styles.starBtn}
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name={star <= (myRating || 0) ? "star" : "star-outline"}
                  size={compact ? 14 : 24}
                  color={star <= (myRating || 0) ? STAR_COLOR : STAR_EMPTY_COLOR}
                />
              </TouchableOpacity>
            ))}
            {submitting && <ActivityIndicator size="small" color={STAR_COLOR} style={{ marginLeft: 6 }} />}
          </View>
          {/* Comment input (non-compact, canRate, not yet rated) */}
          {!compact && !myRating && (
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              maxLength={200}
              multiline
            />
          )}
          {/* Show my comment if already rated */}
          {!compact && myRating && myComment && (
            <Text style={styles.myCommentText}>{myComment}</Text>
          )}
        </View>
      ) : (
        <View style={styles.readOnlyRow}>
          <View style={styles.starsRow}>
            {[0, 1, 2, 3, 4].map(renderStar)}
          </View>
          {avgRating != null && (
            <Text style={[styles.ratingText, compact && styles.ratingTextCompact]}>
              {avgRating}
            </Text>
          )}
          {totalReviews > 0 && (
            <Text style={[styles.countText, compact && styles.countTextCompact]}>
              ({totalReviews})
            </Text>
          )}
        </View>
      )}
      {/* Show text comments in non-compact mode */}
      {!compact && comments.length > 0 && (
        <View style={styles.commentsSection}>
          {comments.slice(0, 3).map((c, i) => (
            <View key={i} style={styles.commentRow}>
              <View style={styles.commentStars}>
                {[1, 2, 3, 4, 5].map(s => (
                  <MaterialIcons
                    key={s}
                    name={s <= c.rating ? "star" : "star-outline"}
                    size={10}
                    color={s <= c.rating ? STAR_COLOR : STAR_EMPTY_COLOR}
                  />
                ))}
                <Text style={styles.commentName}>{c.customer_name}</Text>
              </View>
              <Text style={styles.commentText} numberOfLines={2}>{c.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 6 },
  containerCompact: { marginVertical: 2 },
  loadingWrap: { paddingVertical: 8, alignItems: "flex-start" },
  loadingWrapCompact: { paddingVertical: 2 },
  readOnlyRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  interactiveRow: { flexDirection: "column", gap: 4 },
  avgRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  starBtn: { padding: 2 },
  labelText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#374151", marginLeft: 2 },
  ratingTextCompact: { fontSize: 12 },
  countText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  countTextCompact: { fontSize: 11 },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#374151",
    backgroundColor: "#F9FAFB",
    marginTop: 4,
    maxHeight: 60,
  },
  myCommentText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 2,
  },
  commentsSection: {
    marginTop: 8,
    gap: 6,
  },
  commentRow: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  commentStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 2,
  },
  commentName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  commentText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 16,
  },
});
