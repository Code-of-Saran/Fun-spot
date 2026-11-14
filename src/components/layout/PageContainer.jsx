import './PageContainer.css';

/** Width-constrained, padded content area used by every inner page. */
export default function PageContainer({ as: Tag = 'main', narrow = false, className = '', children, ...rest }) {
  return (
    <Tag className={`page-container${narrow ? ' page-container--narrow' : ''} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
