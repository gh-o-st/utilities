export default class Dropdown {
    constructor(dropdownId, options = {}) {
        this.dropdown = document.getElementById(dropdownId);
        this.selected = this.dropdown.querySelector('.dropdown-selected');
        this.textSpan = this.dropdown.querySelector('.dropdown-text');
        this.optionsContainer = this.dropdown.querySelector('.dropdown-options');
        this.value = options.defaultValue || '';
        this.onChange = options.onChange || (() => {});
        this.beforeChange = options.beforeChange || (() => true);
        
        this.init();
    }
    
    init() {
        this.selected.addEventListener('click', () => {
            this.toggle();
        });
        
        this.optionsContainer.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('dropdown-option') && 
                !e.target.classList.contains('disabled')) {
                this.selectOption(e.target);
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.close();
            }
        });
    }
    
    toggle() {
        const isOpen = this.optionsContainer.style.display === 'block';
        if (isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.optionsContainer.style.display = 'block';
        this.dropdown.classList.add('dropdown-open');
    }
    
    close() {
        this.optionsContainer.style.display = 'none';
        this.dropdown.classList.remove('dropdown-open');
    }
    
    selectOption(optionElement) {
        const value = optionElement.getAttribute('data-value');
        const text = optionElement.textContent;
        
        if (this.beforeChange(value, this.value)) {
            this.value = value;
            this.textSpan.textContent = text;
            this.close();
            this.onChange(value, text);
        }
    }
    
    setValue(value) {
        const option = this.optionsContainer.querySelector(`[data-value="${value}"]`);
        if (option) {
            this.selectOption(option);
        }
    }
    
    setOptionDisabled(value, disabled) {
        const option = this.optionsContainer.querySelector(`[data-value="${value}"]`);
        if (option) {
            option.classList.toggle('disabled', disabled);
        }
    }
}