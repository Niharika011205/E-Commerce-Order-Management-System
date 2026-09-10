import React, { useState, useEffect } from 'react';
import { getProductReviews, addReview, editReview, deleteReview } from '../../api/productApi';
import { Button } from '../common/Button';
import { StarRating } from '../common/StarRating';
import { Loader } from '../common/Loader';
import { useToast } from '../common/ToastProvider';
import '../../styles/customer.css';

export function ReviewSection({ productId, user }) {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ rating: 5, title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const data = await getProductReviews(productId);
      setReviews(data);
    } catch (err) {
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await editReview(productId, editingId, form);
      } else {
        await addReview(productId, form);
      }
      setForm({ rating: 5, title: '', description: '' });
      setShowForm(false);
      setEditingId(null);
      fetchReviews();
      toast.success(editingId ? 'Review updated' : 'Review submitted');
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (review) => {
    setForm({
      rating: review.rating,
      title: review.title,
      description: review.description
    });
    setEditingId(review.id);
    setShowForm(true);
  };

  const handleDeleteClick = async (reviewId) => {
    try {
      await deleteReview(productId, reviewId);
      fetchReviews();
      toast.info('Review deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ rating: 5, title: '', description: '' });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="review-section">
      <div className="review-header">
        <h2>Customer Reviews</h2>
        {user.role === 'CUSTOMER' && (
          <Button variant="outline" onClick={showForm ? handleCancelForm : () => setShowForm(true)}>
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        )}
      </div>

      {showForm && (
        <form className="review-form" onSubmit={handleReviewSubmit}>
          <div className="form-grid">
            <label className="full-width">
              Overall Rating
              <StarRating rating={form.rating} onRate={(r) => setForm(prev => ({...prev, rating: r}))} />
            </label>
            <label className="full-width">
              Headline
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required maxLength={150} placeholder="What's most important to know?" />
            </label>
            <label className="full-width">
              Written Review
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required maxLength={2000} rows={4} placeholder="What did you like or dislike?" />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <Loader text="Loading reviews..." />
      ) : error ? (
        <p className="flash-error">{error}</p>
      ) : reviews.length === 0 ? (
        <p>No reviews yet. Be the first to review this product!</p>
      ) : (
        <div className="review-list">
          {reviews.map(review => (
            <div key={review.id} className="review-item">
              <div className="review-author">
                <div className="author-avatar"></div>
                <span className="author-name">{review.customerUsername}</span>
              </div>
              <div className="review-title-row">
                <StarRating rating={review.rating} />
                <span className="review-title">{review.title}</span>
              </div>
              <span className="review-date">Reviewed on {formatDate(review.reviewDate)}</span>
              <p className="review-desc">{review.description}</p>
              
              {user.username === review.customerUsername && (
                <div className="review-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <Button variant="outline" onClick={() => handleEditClick(review)} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>Edit</Button>
                  <Button variant="outline" onClick={() => handleDeleteClick(review.id)} style={{ padding: '4px 12px', fontSize: '0.85rem', color: '#d9534f', borderColor: '#d9534f' }}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
