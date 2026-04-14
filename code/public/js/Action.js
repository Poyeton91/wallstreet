class Action {
    constructor(name, initialPrice) {
        this.name = name;
        this.price = initialPrice;
        this.history = [initialPrice];
    }

    updatePrice() {
        const variation = Math.floor(Math.random() * 11) - 5; // entre -5 et +5
        this.price = Math.max(1, this.price + variation);
        this.history.push(this.price);

        if (this.history.length > 50) {
            this.history.shift();
        }
    }
}
