/*Jquery插件*/
(function($){
	
	
	/*	
		表单验证
		
		页面元素:
			
			<input id="attr"  validate="{blur:'name`msg',valid:'name`msg' | ['name`msg','name'],res: 'name'}"  eid='tip'/>
			<span id='tip'></span>
			
			1.元素validate属性介绍:
				valid : 在调用$Table.validate()的时候被验证的需求
				res : 为验证成功组合成JSON调用的函数名(通过helper注册)
				其他: 表示注册的监听事件, 如blur force 等等
				
				以 ` (ESC键下面的按钮) 符号分开
				"name`msg" -->
					name : 注册的函数名
					msg  : 错误信息提示
				变种形式有
					'name'
			
			2.元素属性eid为指向错误提示的控件, 可以不编写, 默认生成一个tip
			
		API:
			$.validate.helper :
				参数为: name[string],msg[string],fn[function] ---> 添加到验证函数集合中
			
					name:'函数名字',
					msg:'默认提示',
					fn:function(val){
						//val为经过trim的的value字符串
						//this指向被验证控件的dom
						
						return true; //pass, 通过验证
						return 'string';//错误提示
						return false, null, undefined//需要错误提示
					},
					
				参数为: name[string],fn[function] ---> 添加到结果组合函数集合中
					name:'函数名字',
					fn:function(res){
						//res 为结果JSON, 把结果写入其中完成构建
						//this指向被验证控件的dom
					}

			var v = $.validate(id) --> 构建一个验证对象
			
			v.validate.prepare({name:'a'});--->预配置结果对象
			
			v.validate(); //开始验证 null -> 验证失败 object-> 通过验证
		
		
		插件中已经包含一些基本的验证函数:
			@Notnull -- 非空
			@Mobile --- 手机号码
			@Telphone -- 电话号码
			@Email --- 邮箱
			@IdCard --- 身份证
			@Chinese --- 中文输入
			@Integer --- 整数
			@+Integer --- 正整数
			@-Integer --- 负整数
			@Number -- 数字输入
			@Word ---  单词输入[A-Za-z-0-9_]
			
		包含一个默认的结果组装:
			@Default -- id:value的格式封装.
	*/
	(function(){
	
	
		if($.validate != undefined)
			throw 'valid已经存在';
		/*
			验证帮助:
				name : [fn,msg];
		*/
		var vHelper = (function(){
			var bag = {};
			//非空
			var vNull = function(val){
				if(/^\S+$/.test(val))
					return true;
				return false;
			};
			bag['@Notnull'] = [vNull,'参数不能为空'];
			//手机号码
			var vMobile = function(val){
				if(/^(\d{11})?$/.test(val))
					return true;
				return false;
			};
			bag['@Mobile'] = [vMobile,'请输入正确手机号码'];
			
			//手机号码
			var vTelphone = function(val){
				if(/^[0-9-]*$/.test(val))
					return true;
				return false;
			};
			bag['@Telphone'] = [vTelphone,'请输入正确电话号码'];
			
			//邮箱
			var vEmail = function(val){
				if(/^(\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*)?$/.test(val))
					return true;
				return false;
			};
			bag['@Email'] = [vEmail,'请输入正确邮箱'];
			//身份证
			var vIdCard = function(val){
				if(/^(\d{18}|\d{15})?$/.test(val))
					return true;
				return false;
			};
			bag['@IdCard'] = [vIdCard,'请输入正确身份证'];
			//汉字
			var vChinese = function(val){
				if(/^([\u4e00-\u9fa5]{0,})?$/.test(val))
					return true;
				return false;
			};
			bag['@Chinese'] = [vChinese,'请输入汉字'];
			//整数
			var vInteger = function(val){
				if(/^(-?[1-9]\d*)?$/.test(val))
					return true;
				return false;
			};
			bag['@Integer'] = [vInteger,'请输入整数'];
			
			//正整数
			var vZInteger = function(val){
				if(/^([1-9]\d*)?$/.test(val))
					return true;
				return false;
			};
			bag['@+Integer'] = [vZInteger,'请输入正整数'];
			
			//负整数
			var vFInteger = function(val){
				if(/^(-[1-9]\d*)?$/.test(val))
					return true;
				return false;
			};
			bag['@-Integer'] = [vFInteger,'请输入负整数'];
			
			//数字
			var vNumber = function(val){
				if(/^\d*$/.test(val))
					return true;
				return false;
			};
			bag['@Number'] = [vNumber,'请输入数字'];
			
			
			//[A-Za-z0-9_]
			var vWord = function(val){
				if(/[0-9A-Za-z_]*/.test(val))
					return true;
				return false;
			
			};
			bag['@Word'] = [vWord,'请输入单词'];
			return bag;
		})();
		/*
			结果构造帮助:
				name : fn
		*/
		var rHelper = (function(){
			var bag = {};
			//基本函数
			var defaultRes = function(res){
				var $this = $(this);
				var id = $.trim($this.attr('id'));
				if(id == undefined || id == ''){
					throw '该条目没有id, 无法使用默认result';
				}
				res[id] =$.trim($this.val());
			};
			
			bag['@Default'] = defaultRes;
			return bag;
		})();
			
		//解析'name`msg'的字符串为对象JSON
		var parseValid = function(str){
			
			var array = str.split('`');
			var item = {};
			if(array.length >= 1){
				if(array[0] == '')
					throw '名字不能为空';
				item.name = array[0];
			}
			if(array.length >= 2){
				if(array[1] == '')
					throw 'msg不能为空';
				item.msg = array[1];
			}
			//name项目不能为空
			if($.type(item.name) != 'string')
				throw str + '字符串解析失败, 至少需要一个名字';
			return item;
		};
		/*
			验证给定条目是否符合条件
				me -> DOM 元素
				name -> 函数名字
				msg -> 元素特别提示的消息,[元素为最高优先级, 函数为第二优先级, 默认为最后, 没有提示为错误状态]
				status -> 错误提示的属性, 当激活的时候[status='open'], 否则为[status= 'close'] | [];
			如果验证通过, 则返回 true
			否则返回false
		*/
		var doValid = function(me,name,msg,status){
			
			//清空原先错误提示
			var eid = $(me).attr("eid");
			if(eid != undefined && eid != ''){
				$("#"+eid).html('');
				//关闭错误标记
				$("#"+eid).attr(status,'close');
			}
			
			if(vHelper[name] == undefined || $.type(vHelper[name][0]) != 'function')
				throw name+'没有该函数';
			var fn = vHelper[name][0];
			//以trim后的value为参数
			var res = fn.call(me,$.trim($(me).val()));
			if($.type(res) == 'boolean' && res == true){
				//成功
				return true;
			}
			//错误消息处理
			var tip = '该字段验证错误';
			var re = /^\S+$/;
			if($.type(msg) == 'string' && re.test(msg))
				tip = msg;
			else if($.type(res) == 'string' && re.test(res)){
				tip = res;
			} else if(re.test(vHelper[name][1])){
				tip = vHelper[name][1];
			}
			
			//增加错误提示
			if(eid == undefined || eid == ''){
				//随机数
				eid = Math.floor(Math.random() * 0x100000000000000);
				$(me).attr('eid',eid);
				//添加一个默认的提示栏
				$(me).parent().append("</br><span style='color: #b94a48;font-weight: bold;' id='"+eid+"'></span>");
			}
			//检测EID的tip数量
			if($("#"+eid).length != 1)
				throw eid + '指向的DOM为空或者多个';
			//添加提示信息
			$("#"+eid).html(tip);
			//错误提示状态为开启
			$("#"+eid).attr(status,'open');
			//失败则返回false
			return false;
		};
			
		
		$.validate = function(id){
		
			var $table = $('#'+id);
			if($table.length != 1)
				throw '没有指定id:'+id+'的对象或者存在多个';
			//需要验证的条目
			/*
				{
					me: DOM 元素
					valid:[{
						name:
						msg:
					}],
					res:name
				}
			*/
			vItems = [];
			//循环该div下所有标注valid属性,
			$table.find('[validate]').each(function(){
				var $this = $(this);
				var me = this;
				//<input id="id"  validate="{blur:'name',valid:'name`msg' | ['name','name`msg'],res: 'name'}"/>
				//以 ` 符号分开
				var validStr = $this.attr('validate');
				if(validStr == '')
					throw 'valid属性不能为空';
				var validate = eval('(' + validStr + ')');
				var vItem = {
					me : me,
					valid:[], //{name,msg}
					res:'@Default' //默认按照ID收集
				};
				//解析验证部分
				if(validate.valid != undefined){
					var type = $.type(validate.valid);
					var array  = null;
					if(type== 'string'){
						array = [validate.valid];
					
					}else if(type == 'array'){
						array = validate.valid;
					
					}else{
						throw 'valid 属性的对象类型错误';
					}
					//解析字符串
					for(var i = 0 ;i < array.length ; ++i){
						vItem.valid.push(parseValid(array[i]));
					}
					//删除该属性
					delete validate.valid;
				}
				
				//解析res部分
				if(validate.res != undefined){
					vItem.res = validate.res;
					delete validate.res;
				}
				//解析事件部分
				for(var attr in validate){
					var bn = validate[attr];
					var v = parseValid(bn);
					$this.bind(attr,function(){

						doValid(me,v.name,v.msg,'eInEvent');
	
					});
				}
				//添加到待检测item中
				vItems.push(vItem);
			});
			
			//构建对象validate方法
			(function(){
				//如果成功则返回该JSON对象, 可以通过validate.result方法修改
				var result = {};
				//给具体对象使用的validate
				//$div 调用的验证函数, 如果失败, 则返回null, 成功则返回json对象
				$table.validate = function(){
					
					//检测在事件部分检验是否已经出错
					if(this.find('[eInEvent="open"]').length != 0)
						return null;
					var ERROR = false;
					//拷贝原有的对象
					var res = $.extend(true,{},result);
					
					for(var i=0; i < vItems.length ; ++i){
						var item = vItems[i];
						var me = item.me;
						for(var j=0; j<item.valid.length;++j){
							var v  = item.valid[j];
							var f = doValid(me,v.name,v.msg,'eInValid');
							if(f == false){
								ERROR = true;
								break;
							}
						}
						if(ERROR ==  false){
							//构建结果
							var fn = rHelper[item.res];
							if($.type(fn) != 'function')
								throw '结果构造函数:'+item.res+'不存在, 或者不为函数类型';
							fn.call(me,res);
						}
					}
					if(ERROR)
						return null;
					return res;
				};
				//修改res对象
				$table.validate.prepare = function(res){
					if($.type(res) != 'object')
						throw '配置的结果对象需要为object类型'
					result  =  res;
				};
			})()
			
			//返回对象
			return $table;
		};
		
		//validate helper 函数, 具体说明在文件头
		$.validate.helper = function(name){
		
			if($.type(name) != 'string' || !/\S+/.test(name))
				throw name + '需要为字符串作为名字且不能为空';
				
			if($.type(arguments[1]) =='string'){
				
				if(vHelper[name] != undefined) 
					throw '该名字已经被占用';
				if(/\S+/.test(arguments[1]) && $.type(arguments[2]) == 'function')
					//添加到验证函数
					vHelper[name] = [arguments[2],arguments[1]];
				else
					throw '验证函数Helper的参数错误,1->string, 2-> string, 3-> function';
			
			}else if($.type(arguments[1]) == 'function'){
				if(rHelper[name] != undefined) 
					throw '结果Helper该名字已经被占用, 1->string, 2->function';
				//结果处理
				rHelper[name] = arguments[1];
			}
	
		};
	
	})();
	

})(jQuery);