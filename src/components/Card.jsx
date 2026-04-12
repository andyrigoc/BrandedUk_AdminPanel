const Card = ({ children, className = '', style }) => {
  const hasBg = style?.backgroundColor || className.includes('bg-')
  return (
    <div className={`${hasBg ? '' : 'bg-white'} border border-gray-200 shadow-sm rounded-xl p-6 ${className}`} style={style}>
      {children}
    </div>
  )
}

export default Card

