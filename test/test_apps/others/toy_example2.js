class Base {
	constructor() {
		this.a = 2;
	}
	baz() {
		console.log('base baz ' + this.a);
	}
}

class Derived extends Base {
	constructor() {
		super();
	}

	bar() {
		super.baz();
	}
	baz() {
		console.log('derived baz ' + this.a);
	}
}

this.d = new Derived();
this.d.bar();