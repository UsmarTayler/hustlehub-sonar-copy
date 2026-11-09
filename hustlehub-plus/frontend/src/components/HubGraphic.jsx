function HubGraphic() {
  return (
    <svg className="hub-graphic" viewBox="0 0 300 300" fill="none" aria-hidden="true">
      <line className="hub-line" x1="150" y1="150" x2="60" y2="80" />
      <line className="hub-line" x1="150" y1="150" x2="230" y2="70" />
      <line className="hub-line" x1="150" y1="150" x2="240" y2="180" />
      <line className="hub-line" x1="150" y1="150" x2="80" y2="220" />
      <line className="hub-line" x1="150" y1="150" x2="170" y2="240" />

      <circle className="hub-node" cx="150" cy="150" r="10" />
      <g className="hub-pulse"><circle className="hub-node teal" cx="60" cy="80" r="6" /></g>
      <g className="hub-pulse"><circle className="hub-node" cx="230" cy="70" r="5" /></g>
      <g className="hub-pulse"><circle className="hub-node teal" cx="240" cy="180" r="6" /></g>
      <g className="hub-pulse"><circle className="hub-node" cx="80" cy="220" r="5" /></g>
      <g className="hub-pulse"><circle className="hub-node teal" cx="170" cy="240" r="6" /></g>
    </svg>
  );
}

export default HubGraphic;