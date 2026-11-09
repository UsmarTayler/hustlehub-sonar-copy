import { Link } from 'react-router-dom';


function GigCard({ gig }) {
  return (
    <Link to={`/gigs/${gig._id}`} className="gig-card-link">
      <article className="gig-card">
        <div className="gig-card-header">
          <h3>{gig.title}</h3>
          <span className="gig-price">R{gig.price}</span>
        </div>
        <p className="gig-description">{gig.description}</p>
        <div className="gig-card-footer">
          <span className="gig-freelancer">
            by {gig.freelancerName || 'Freelancer'}
          </span>
          <span className="gig-category">{gig.category}</span>
        </div>
      </article>
    </Link>
  );
}

export default GigCard;