const hexToRgba = (hex, alpha) => {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(130, 130, 130, ${alpha})`; // A neutral grey for invalid colors
  }
  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  c = `0x${c.join('')}`;
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const tagSelectStyles = {
  control: (provided) => ({
    ...provided,
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    boxShadow: 'none',
    minHeight: 'auto',
    '&:hover': {
      borderColor: '#adb5bd',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#6c757d',
    fontSize: '0.8rem',
  }),
  input: (provided) => ({
    ...provided,
    color: '#495057',
    fontSize: '0.8rem',
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: '0.8rem',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0.45rem 0.75rem',
  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      display: 'flex',
      alignItems: 'center',
      color: data.color,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
        ? hexToRgba(data.color, 0.15)
        : isFocused
        ? hexToRgba(data.color, 0.08)
        : undefined,
      ':before': {
        backgroundColor: data.color,
        borderRadius: '50%',
        content: '" "',
        display: 'block',
        marginRight: 8,
        height: 8,
        width: 8,
      },
      ':active': {
        ...styles[':active'],
        backgroundColor: !isDisabled
          ? hexToRgba(data.color, 0.2)
          : undefined,
      },
    };
  },
  multiValue: (provided, { data }) => ({
    ...provided,
    backgroundColor: hexToRgba(data.color, 0.15),
    borderRadius: '4px',
  }),
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    color: data.color,
    fontWeight: '500',
    padding: '3px',
    paddingLeft: '6px',
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    color: data.color,
    borderRadius: '0 4px 4px 0',
    ':hover': {
      backgroundColor: data.color,
      color: 'white',
    },
  }),
}; 