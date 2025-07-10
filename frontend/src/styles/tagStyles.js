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
  control: (styles) => ({
    ...styles,
    borderColor: '#ccc',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#aaa',
    },
  }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      display: 'flex',
      alignItems: 'center',
      color: '#333',
      backgroundColor: isDisabled
        ? undefined
        : isSelected
        ? hexToRgba(data.color, 0.4)
        : isFocused
        ? hexToRgba(data.color, 0.1)
        : undefined,
      ':before': {
        backgroundColor: data.color,
        borderRadius: '10px',
        content: '" "',
        display: 'block',
        marginRight: 8,
        height: 10,
        width: 10,
      },
      ':active': {
        ...styles[':active'],
        backgroundColor: !isDisabled
          ? hexToRgba(data.color, 0.6)
          : undefined,
      },
    };
  },
  multiValue: (styles, { data }) => {
    return {
      ...styles,
      backgroundColor: hexToRgba(data.color, 0.15),
      borderRadius: '4px',
    };
  },
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