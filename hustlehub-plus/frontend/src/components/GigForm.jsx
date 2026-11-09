import { useState } from 'react';
import { Link } from 'react-router-dom';
import './GigForm.css';


const TITLE_RE = /^[A-Za-z0-9][A-Za-z0-9 .,'&()/+#:-]{2,99}$/;
const CATEGORY_RE = /^[A-Za-z][A-Za-z \-&]{1,49}$/;
const FORBIDDEN_RE = /[<>{}`\\]/;

function validate(values) {
  const errors = {};

  const title = values.title.trim();
  if (!title) {
    errors.title = 'Title is required.';
  } else if (!TITLE_RE.test(title)) {
    errors.title =
      'Title must be 3–100 characters, start with a letter or number, and cannot contain < > { } or \\.';
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = 'Description is required.';
  } else if (description.length < 10) {
    errors.description = 'Description must be at least 10 characters.';
  } else if (description.length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer.';
  } else if (FORBIDDEN_RE.test(description)) {
    errors.description = 'Description cannot contain < > { } or backticks.';
  }

  const priceRaw = String(values.price).trim();
  if (!priceRaw) {
    errors.price = 'Price is required.';
  } else {
    const price = Number(priceRaw);
    if (!Number.isFinite(price)) {
      errors.price = 'Price must be a number.';
    } else if (price <= 0) {
      errors.price = 'Price must be greater than 0.';
    } else if (price > 1000000) {
      errors.price = 'Price must be 1,000,000 or less.';
    }
  }

  const category = values.category.trim();
  if (!category) {
    errors.category = 'Category is required.';
  } else if (!CATEGORY_RE.test(category)) {
    errors.category =
      'Category must be 2–50 characters, start with a letter, and may only contain letters, spaces, hyphens and ampersands.';
  }

  const duration = values.duration.trim();
  if (duration && duration.length > 100) {
    errors.duration = 'Duration must be 100 characters or fewer.';
  } else if (duration && FORBIDDEN_RE.test(duration)) {
    errors.duration = 'Duration cannot contain < > { } or backticks.';
  }

  return errors;
}


function GigForm({
  initialValues,
  heading,
  subtext,
  submitLabel = 'Publish gig',
  submittingLabel = 'Publishing…',
  cancelTo,
  onSubmit,
}) {
  const [values, setValues] = useState({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    price:
      initialValues?.price !== undefined && initialValues?.price !== null
        ? String(initialValues.price)
        : '',
    category: initialValues?.category || '',
    duration: initialValues?.duration || '',
  });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError('');

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        price: Number(values.price),
        category: values.category.trim(),
      };
      const duration = values.duration.trim();
      if (duration) payload.duration = duration;

      await onSubmit(payload);
    } catch (err) {
      const response = err.response?.data;
      if (Array.isArray(response?.errors) && response.errors.length > 0) {
        const serverErrors = {};
        response.errors.forEach((item) => {
          serverErrors[item.field] = item.message;
        });
        setErrors(serverErrors);
      } else {
        setGeneralError(
          response?.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1>{heading}</h1>
      {subtext && <p className="gig-form-subtext">{subtext}</p>}

      <div className="form-field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          value={values.title}
          onChange={handleChange}
          placeholder="e.g. Logo design in 48 hours"
          maxLength={100}
        />
        {errors.title && <p className="error-text">{errors.title}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={values.description}
          onChange={handleChange}
          placeholder="What's included, what you need from the client, deliverables…"
          maxLength={2000}
        />
        <p className="field-hint">
          {values.description.length}/2000 characters
        </p>
        {errors.description && (
          <p className="error-text">{errors.description}</p>
        )}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="price">Price (R)</label>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={values.price}
            onChange={handleChange}
            placeholder="450"
          />
          {errors.price && <p className="error-text">{errors.price}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="category">Category</label>
          <input
            id="category"
            name="category"
            type="text"
            value={values.category}
            onChange={handleChange}
            placeholder="e.g. Design"
            maxLength={50}
          />
          {errors.category && (
            <p className="error-text">{errors.category}</p>
          )}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="duration">Duration (optional)</label>
        <input
          id="duration"
          name="duration"
          type="text"
          value={values.duration}
          onChange={handleChange}
          placeholder="e.g. 3–5 days"
          maxLength={100}
        />
        {errors.duration && <p className="error-text">{errors.duration}</p>}
      </div>

      {generalError && <p className="error-text">{generalError}</p>}

      <div className="gig-form-actions">
        <Link to={cancelTo} className="gig-form-btn secondary">
          Cancel
        </Link>
        <button
          type="submit"
          className="gig-form-btn primary"
          disabled={submitting}
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default GigForm;