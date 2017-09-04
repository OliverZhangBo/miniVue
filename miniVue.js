// author：ghostdp

function Vue(opts){
	this.init(opts);
}
Vue.prototype.init = function(opts){
	this.$el = document.querySelector(opts.el);
	this.$data = opts.data;
	this.$methods = opts.methods;
	this.$computed = opts.computed;
	this.directArr = [];
	this.modelFocus = false;
	this.setArray();
	this.$tmpl = this.template(this.$el);
	this.render(this.$tmpl);
	this.listenDatas();
};
Vue.prototype.template = function(elem){
	var code = 'var r = [];\n';
	var re_exp = /([^{]*)\{\{\s*([^}]+)\s*\}\}([^{]*)/g;
	var re_tag = /(<([^>]+)>)/g;
	var re_vFor = /\((\w+),(\w+)\)\sin\s(\w+)/;
	function gets(elem,childFlag){
		var childElems = elem.childNodes;
		for(var i=0;i<childElems.length;i++){
			if(childElems[i].nodeType == 3){
				var str = childElems[i].nodeValue.toString().trim();
				if( re_exp.test(str) ){
					code += str.replace(re_exp,function($0,$1,$2,$3){
						if(childFlag){
							return 'r.push(\''+$1+'\');\nr.push('+$2+');\nr.push(\''+$3+'\');\n';
						}
						else{
							return 'r.push(\''+$1+'\');\nr.push(data.'+$2+');\nr.push(\''+$3+'\');\n';
						}	
					});
				}
				else{
					code += 'r.push(\''+str+'\');';
				}
			}
			else if(childElems[i].nodeType == 1){
				if( childElems[i].getAttribute('v-for') ){
					var vFor = childElems[i].getAttribute('v-for');
					var vForAttrs = vFor.match(re_vFor);
					childElems[i].removeAttribute('v-for');
					var tags = childElems[i].outerHTML.match(re_tag);
					code += 'data.'+vForAttrs[3]+'.forEach(function('+vForAttrs[1]+','+vForAttrs[2]+'){\n';
					if(tags[0].includes('(')){
						code += 'r.push(\''+tags[0].substring(0,tags[0].indexOf('(')+1)+'\');\n';
						code += 'r.push('+tags[0].substring(tags[0].indexOf('(')+1,tags[0].indexOf(')'))+');\n';
						code += 'r.push(\''+tags[0].substring(tags[0].indexOf(')'))+'\');\n';
					}
					else{
						code += 'r.push(\''+tags[0]+'\');\n';
					}
					gets(childElems[i],true);
					if(tags[1]){
						code += 'r.push(\''+tags[tags.length-1]+'\');\n';
					}
					code += '});\n';
				}
				else{
					var tags = childElems[i].outerHTML.match(re_tag);
					if(tags[0].includes('(')){
						code += 'r.push(\''+tags[0].substring(0,tags[0].indexOf('(')+1)+'\');\n';
						code += 'r.push('+tags[0].substring(tags[0].indexOf('(')+1,tags[0].indexOf(')'))+');\n';
						code += 'r.push(\''+tags[0].substring(tags[0].indexOf(')'))+'\');\n';
					}
					else{
						code += 'r.push(\''+tags[0]+'\');\n';
					}
					gets(childElems[i]);
					if(tags[1]){
						code += 'r.push(\''+tags[tags.length-1]+'\');\n';
					}
				}
			}
		}
		return code;
	}
	return gets(elem) + 'return r.join(\'\');';
};
Vue.prototype.render = function(tmpl){
	var fn = new Function('data',tmpl);
	this.$el.innerHTML = fn(this.$data);
	this.collectDirect();
	this.setCollectDirect();
};
Vue.prototype.listenDatas = function(){
	for(var attr in this.$data){
		this.listenData(this,attr,this.$data);
		if(Array.isArray(this.$data[attr])){
			this.$data[attr].__proto__ = this.newArrMethods;
			for(var i=0;i<this.$data[attr].length;i++){
				for(var attr_child in this.$data[attr][i]){
					this.listenData(this.$data[attr][i],attr_child,this.cloneObj(this.$data[attr][i]));	
				}
			}
		}
	}
};
Vue.prototype.listenData = function(obj,attr,data){
	var This = this;
	Object.defineProperty(obj, attr, {
		configurable : true,
		enumerable : true,
		get: function(){
			return data[attr];
		},
		set: function(val){
			data[attr] = val;
			This.render(This.$tmpl);	
		}
	});
};
Vue.prototype.cloneObj = function(obj){  
	var newObj = {};  
	if(obj instanceof Array){  
		newObj = [];  
	}  
	for(var key in obj){  
		var val = obj[key];  
		newObj[key] = typeof val === 'object' ? this.cloneObj(val): val;  
	}  
	return newObj;  
};
Vue.prototype.setArray = function(){
	var This = this;
	var arrayProto = Array.prototype;
	var arrayMethods = Object.create(arrayProto);
	this.newArrMethods = arrayMethods;
	[
	  'push',
	  'pop',
	  'shift',
	  'unshift',
	  'splice',
	  'sort',
	  'reverse'
	]
	.forEach(function(method){
		var original = arrayProto[method];
		This.def(arrayMethods, method, function mutator (){
			var args = [], len = arguments.length;
			while(len--){
				args[len] = arguments[len];
				for(var attr in args[len]){
					This.listenData(args[len],attr,This.cloneObj(args[len]));
				}
			}
			var result = original.apply(this, args);
			This.render(This.$tmpl);
			return result;
		});
	});
};
Vue.prototype.def = function(obj,key,val,enumerable){
	Object.defineProperty(obj,key,{
		value: val,
		enumerable: !!enumerable,
		writable: true,
		configurable: true
	});
};
Vue.prototype.collectDirect = function(){
	this.directArr = [];
	function get(elem){
		var attrs = [];
		for(var i=0; i<elem.attributes.length;i++){
			var nodeName = elem.attributes[i].nodeName;
			var nodeValue = elem.attributes[i].nodeValue;
			if( nodeName.includes('v-') ){
				elem.removeAttribute(nodeName);
				attrs.push({name : nodeName , value : nodeValue});
			}
		}
		this.directArr.push({ el : elem , attrs : attrs });
		var children = elem.children;
		if(children){
			for(var i=0;i<children.length;i++){
				get.bind(this)(children[i]);
			}
		}
	}
	get.bind(this)(this.$el);
};
Vue.prototype.setCollectDirect = function(){
	for(var i=0;i<this.directArr.length;i++){
		var attrs = this.directArr[i].attrs;
		var elem = this.directArr[i].el;
		for(var j=0;j<attrs.length;j++){
			var keys = attrs[j].name.split(':');
			this[keys[0]](elem,keys[1],attrs[j].value);
		}
	}	
};
Vue.prototype['v-on'] = function(elem,prop,value){
	var reg_split = /(\w+)\((\w+)\)/;
	var result = value.match(reg_split);
	if(result){
		elem.addEventListener(prop,function(){
			this.$methods[result[1]].bind(this)( isNaN(Number(result[2])) ? result[2] : Number(result[2]) );
		}.bind(this),false);
	}
	else{
		elem.addEventListener(prop,this.$methods[value].bind(this),false);	
	}
};
Vue.prototype['v-model'] = function(elem,prop,value){
	var This = this;
	elem.value = this.$data[value];
	if(this.modelFocus){
		elem.focus();
	}
	elem.addEventListener('input',function(){
		This.$data[value] = this.value;
		This.modelFocus = true;
		This.render(This.$tmpl);
	},false);
	elem.addEventListener('blur',function(){
		setTimeout(function(){
			This.modelFocus = false;
		},100);
	},false);	
};