const Input = ({ label, id, hint, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className="block text-[13px] font-medium text-zinc-400">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`block w-full rounded-lg border border-edge bg-panel px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40 ${className}`}
      {...props}
    />
    {hint && <p className="text-xs text-zinc-500">{hint}</p>}
  </div>
);

export default Input;
