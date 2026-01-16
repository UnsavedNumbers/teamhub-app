interface IconProps {
  name: string
  size?: string
  className?: string
}

export default function Icon({ name, size = 'text-xl', className = '' }: IconProps) {
  return (
    <span className={`material-symbols-outlined ${size} ${className}`}>
      {name}
    </span>
  )
}
