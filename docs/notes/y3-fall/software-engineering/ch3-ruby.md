# Ruby
解释型，面向对象语言

感觉这种意义上非常像Python

解释器叫`ruby`，互动终端叫`irb`

输出：
- `puts`

    会换行
- `print`

    不会换行
    
    
## Comments
单行注释：
```ruby{.line-numbers}
# this is a single line comment
```
多行注释：
```ruby{.line-numbers}
=begin
this is a multiline comment
nothing in here will be part of the 
code
=end
```

## Variables
### Constants
==开头第一个字母必须是大写==，一般全大写是常态：
```ruby{.line-numbers}
MYCONSTANT = "hello"
```
!!! note
    其实Ruby允许你改变常量的值，只不过会报一个warning

### Declaring a Variable
反正是动态类型

### Identifying a Ruby Variable Type
`kind_of?`方法可以判断变量的类型:
```Ruby{.line-numbers highlight=1}
y.kind_of? Integer
=> true
```
> 返回boolean的方法一般会在最后包含`?`

或者直接`.class`问他类型是啥：
```Ruby{.line-numbers highlight=1}
y.class
=> Fixnum
```

### Converting Variable Values
尽管你可以通过直接给变量赋值的方式改变变量的类型，有时候我们还是需要不那么destructive的方法的

每个类自己有一些方法去转换：

`Fixnum`用`to_f`转`Float`:
```ruby{.line-numbers highlight=3}
y = 20
=> 20
y.to_f
=> 20.0
```
`to_s`则会转成string:
```ruby{.line-numbers highlight=1}
54321.to_s
=> "54321"
```
## Variable Scope
|Name Begins With|	Variable Scope
|---|---|
`$`|	A global variable
`@`	|An instance variable
`[a-z]` or `_`|	A local variable
`[A-Z]`|	A constant
`@@`|	A class variable

以及，有两个特殊的保留字：
- `nil`
    : uninitialized variables
- `self`
    : currently executing object

### Detecting the Scope of a Ruby Variable
可以用`defined?`来确定一个变量究竟是什么作用域的：
```ruby{.line-numbers highlight=[3, 8]}
x = 10
=> 10
defined? x
=> "local-variable"

$x = 10
=> 10
defined? $x
=> "global-variable"
```

### Global Variables `$`
有很多预定义的全局变量：

|Variable Name|	Variable Value|
|---|---|
`$@`|	The location of latest error
`$_`|	The string last read by gets
`$.`|	The line number last read by interpreter
`$&`|	The string last matched by regexp
`$~`|	The last regexp match, as an array of subexpressions
`$n`|	The nth subexpression in the last match (same as $~[n])
`$=`|	The case-insensitivity flag
`$/`|	The input record separator
`$\`|	The output record separator
`$0`|	The name of the ruby script file currently executing
`$*`|	The command line arguments used to invoke the script
`$$`|	The Ruby interpreter's process ID
`$?`|	The exit status of last executed child process

### Class Variables `@@`
默认是所有对象共享的，有点像`static`
```ruby{.line-numbers}
@@total = 0
```

### Instance Variables `@`
默认对象之间不共享的
```ruby{.line-numbers}
@total = 10
```

### Constants
作用域取决于在哪里定义的

## Symbols
以`:`开头，似乎是个独有的类型：

反正不是string
```ruby{.line-numbers}
a = :name
```

关于symbol和variable有啥区别：[https://stackoverflow.com/questions/24943106/what-is-the-difference-between-a-symbol-and-a-variable-in-ruby](https://stackoverflow.com/questions/24943106/what-is-the-difference-between-a-symbol-and-a-variable-in-ruby)

## Hashes
就是字典：
```ruby{.line-numbers}
h = {"greeting" => "hello", "farewell”=>"goodbye"}
person = {:name => "Mike", :age => 30}
person = { name: "Mike", age: 30}
```
可以看到symbol也是可以作为键的

## Number Classes and Conversions
略

## Methods
### Declaring and Calling a Ruby Method
```ruby{.line-numbers}
def name( arg1, arg2, arg3, ... )
   .. ruby code ..
   return value
end
```
假如函数不存在参数，调用函数的时候甚至可以==不写括号==（？）

### Passing a Variable Number of Arguments to a Method
```ruby{.line-numbers}
def displaystrings( *args )
        args.each {|string| puts string}
end
```

### Returning a Value from a Function
虽然说也是用return，但是只能返回一个对象，想返回多个的话就塞到array之类的东西里面吧

即便没有return语句，也会默认返回最后一个statement：
```ruby{.line-numbers}
def add(num1, num2)
sum = num1 + num2
return sum
end
```
可以简化成：
```ruby{.line-numbers}
def add num1, num2
num1 + num2
end
```

### Method Aliases
反正就是给个别名
```ruby{.line-numbers highlight=[7]}
irb(main):001:0> def multiply(val1, val2 )
irb(main):002:1>      result = val1 * val2
irb(main):003:1>      return result
irb(main):004:1> end
=> nil

alias docalc multiply
=> nil

docalc( 10, 20 )
=> 200

multiply( 10, 20 )
=> 200
```

## Ranges `..`/`...`
有三种不同的：
- **sequences**
- **conditions**
- **intervals**

### Sequence Ranges
`..`和`...`两种不同的：
```ruby{.line-numbers}
1..10    # Creates a range from 1 to 10 inclusive
1...10   # Creates a range from 1 to 9
```
可以通过`to_a`来转换成array:
```ruby{.line-numbers highlight=[1]}
(1..10).to_a
=> [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

其实可以放进range的东西很多，只要是定义了特定方法的类都可以

### Using Range Methods
反正就是有一些奇特的类似array的方法
```ruby{.line-numbers}
words = 'cab'..'car'

words.min         # get lowest value in range
=> "cab"

words.max         # get highest value in range
=> "car"

words.include?('can') # check to see if a value exists in the range
=> true

words.reject {|subrange| subrange < 'cal'} # reject values below a specified range value
=> ["cal", "cam", "can", "cao", "cap", "caq", "car"]

words.each {|word| puts "Hello " + word} # iterate through each value and perform a task
Hello cab
Hello cac
Hello cad
Hello cae
Hello caf
Hello cag
Hello cah
Hello cai
Hello caj
Hello cak
Hello cal
Hello cam
Hello can
Hello cao
Hello cap
Hello caq
Hello car
```

### Ranges as Conditional Expressions
```ruby{.line-numbers}
while input = gets
puts input + " triggered" if input =~ /start/ .. input =~ /end/
end
```
居然看不懂

### Range Intervals
非常适合用来判断某个值是否落在range里面：
```ruby{.line-numbers}
(1..20) === 15       # Does the number fit in the range 1 to 20
=> true
('k'..'z') === 'm'   # Does the letter fall between the letters 'k' and 'z' in the alphabet?
=> true
```

### Range in `case` Statements
和`case`一起使用的时候，就能发挥出意想不到的效果
```ruby{.line-numbers}
score = 70

result = case score
   when 0..40: "Fail"
   when 41..60: "Pass"
   when 61..70: "Pass with Merit"
   when 71..100: "Pass with Distinction"
   else "Invalid Score"
end

puts result
```

## Arrays
### Create an Array
对`Array`类调用`new`:
```ruby{.line-numbers}
days_of_week = Array.new
```
> 居然也不需要括号就能调用。。。还真的是没有参数就不需要

`empty?`判断一下是否是空的：
```ruby{.line-numbers}
days_of_week.empty?
=> true
```

也可以给`new`传一个数字，来指定Array的初始大小:
```ruby{.line-numbers}
days_of_week = Array.new(7)
=> [nil, nil, nil, nil, nil, nil, nil]
```
需要注意的是，默认的值是`nil`

### Populating an Array with Data
全部初始化成同一个值：
```ruby{.line-numbers}
days_of_week = Array.new(7, "today")
=> ["today", "today", "today", "today", "today", "today", "today"]
```
也可以用`[]`来挨个指定（这是什么鬼语法啊
```ruby{.line-numbers}
days_of_week = Array[ "Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun" ]
=> ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"]
```

把上面的玩意简化一下就变成了我们熟悉的语法：
```ruby{.line-numbers}
days_of_week = [ "Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun" ]
```

### Accessing Array Elements
懂？
```ruby{.line-numbers}
days_of_week[0]
=> "Mon"
days_of_week.at(0)
=> "Mon"
days_of_week[-1]
=> "Sun"
days_of_week.first
=> "Mon"

days_of_week.last
=> "Sun"
```
### Finding the Index of an Element
懂？
```ruby{.line-numbers}
days_of_week.index("Wed")
=> 2
```
切片的方法：
```ruby{.line-numbers}
days_of_week[1, 3]
=> ["Tues", "Wed", "Thu"]
days_of_week[1..3]
=> ["Tues", "Wed", "Thu"]
days_of_week.slice(1..3)
=> ["Tues", "Wed", "Thu"]
```

## Advanced Arrays
## Blocks
由`{}`或者`do`/`end`包围，可以用来作为参数传递给方法或者循环

新的block:
```ruby{.line-number}
p = Proc.new { puts 'This is a block' }
p.call
```
接受block作为参数：
```ruby{.line-numbers}
def meth1(p1, p2, &block)
 puts "Class is " + block.class.to_s
 block.call
end
meth1(1, 2) { puts "This is a block" }
```
block同样还可以通过`||`==接受参数==
```ruby{.line-numbers}
3.times {|n| puts "hello" + n.to_s}
```


## Operators
### Bitwise Operators
可以甚至对二进制进行操作？？？

Combined Operator|	Equivalent
---|---
`~`	|Bitwise NOT (Complement)
`|`	|Bitwise OR
`&`	|Bitwise AND
`^`	|Bitwise Exclusive OR
`<<`|	Bitwise Shift Left
`>>`|	Bitwise Shift Right

在此之上甚至还有`~=`, `>>=`, `<<=`, `^=`, `&=`等等

## Operator Precedence
懒得看

## Math Functions and Methods
同上

## Logical Operators
没啥不同的

## OOP
Ruby里的所有东西其实都是Object

### Defining a Ruby Class
因为class的名字是不可变的，所以他的==开头必须是大写的==？？？

```ruby{.line-numbers}
class BankAccount
   def initialize ()
   end

   def test_method
        puts "The class is working"
   end
end
```

### Instance Variables and Accessor Methods
```ruby{.line-numbers}
class BankAccount

   def accountNumber # getter
        @accountNumber
   end

   def accountNumber=( value ) # setter
        @accountNumber = value
   end

end
```
这奇葩的定义语法。。。

==默认成员是private==的，所以我们需要写这些方法来访问！

其实我们还有更加偷懒的方法来生成getter，就是使用`attr_reader` (注意用的是==symbol==):
```ruby{.line-numbers}
class Point
    attr_reader :x, :y
    def initialize(x, y)
        @x = x
        @y = y
    end
end
```
setter也可以用`attr_writer`生成：
```ruby{.line-numbers}
attr_writer :x, :y
```

甚至可以同时生成setter和getter，用`attr_accessor`:
```ruby{.line-numbers}
attr_accessor :x, :y
```

### Class Inheritance 
用`<`表示继承：
```ruby{.line-numbers}
class NewBankAccount < BankAccount

   def customerPhone
        @customerPhone
   end

   def customerPhone=( value )
        @customerPhone = value
   end

end
```

假如父类并没有定义在同一个文件里，则需要：
```ruby{.line-numbers}
require 'BankAccount'
```
### `module`
参考[这里](https://www.runoob.com/ruby/ruby-module.html)

是一种把方法、类、常量组合在一起的方式

有两种好处：
- 提供了一个namespace，避免名字冲突
- 实现了mixin

和类非常相似，但是也有不同：
- 不能实例化
- 没有子类
- 只能被另一个模块定义

```ruby{.line-numbers}
module Stringify 
    def stringify
        case @value
            when 1..5 
                "value: 1..5"
            when 5..10
                "value: 5..10"
            else 
                "other values"
        end
    end 
end
```
怎么看都和类的写法一样。。。

### Mixin
虽然Ruby不支持多继承，但是使用了Mixin这种概念，借助`module`实现了类似的效果：
```ruby{.line-numbers}
module A
   def a1
   end
   def a2
   end
end
module B
   def b1
   end
   def b2
   end
end
 
class Sample
include A
include B
   def s1
   end
end
 
samp=Sample.new
samp.a1
samp.a2
samp.b1
samp.b2
samp.s1
```
可以看到，我们只需要把`module`给`include`到类里面，就可以直接访问模块的方法了

似乎`include`会把instance level的方法引进来，而`extend`会把class level的引进

## Flow Control
### `if`
最正常的版本：
```ruby{.line-numbers}
if 10 < 20 then
    print "10 is less than 20"
end
```
多行的情况下可以去掉`then`:
```ruby{.line-numbers}
if 10 < 20
    print "10 is less than 20"
end
```
甚至可以把`if`放在`print`最后（顺带扔掉`end`）
```ruby{.line-numbers}
print "10 is less than 20" if 10 < 20
```
用`:`分隔条件和执行块：
```ruby{.line-numbers}
if 10 < 20: print "10 is less than 20" end
```

### `else` & `elsif`
!!! note
    注意是`elsif`不是`elif`!!!

### Ternary Operator `?:`

## `case` Statement
```ruby{.line-numbers}
car = "Patriot"

manufacturer = case car
   when "Focus" then "Ford"
   when "Navigator" then "Lincoln"
   when "Camry" then "Toyota"
   when "Civic" then "Honda"
   when "Patriot" then "Jeep"
   when "Jetta" then "VW"
   when "Ceyene" then "Porsche"
   when "Outback" then "Subaru"
   when "520i" then "BMW"
   when "Tundra" then "Nissan"
   else "Unknown"
end
```

### Number Ranges and the case statement
和range一起使用：
```ruby{.line-numbers}
score = 70

result = case score
   when 0..40 then "Fail"
   when 41..60 then "Pass"
   when 61..70 then "Pass with Merit"
   when 71..100 then "Pass with Distinction"
   else "Invalid Score"
end

puts result
```

## `while` and `until` Loops
最正常的版本：
```ruby{.line-numbers}
i = 0
while i < 5 do
   puts i
   i += 1
end
```
`do`是可以省略的

!!! note
    Ruby里不叫continue，而叫`next`

### `unless` and `until`
直到条件为真才退出：
```ruby{.line-numbers}
i = 0
until i == 5
   puts i
   i += 1
end
```
甚至也可以后置：
```ruby{.line-numbers}
puts i += 1 until i == 5
```
`unless`则是和`if`相反的用法：
```ruby{.line-numbers}
unless i >= 10 # if i < 10
    puts "Student failed"
else
    puts "Student passed"
end
```

## Looping with `for`, `times`, `upto`, `downto`
### `for`
```ruby{.line-numbers}
for i in 1..8 do
    puts i
end
```
`do`同样是可以省略

### `times` method
由Integer类提供，可以让某个任务执行任意次数：
```ruby{.line-numbers}
5.times { |i| puts i }

0
1
2
3
4
```

### `upto` method
由Integer, String, Date类提供
```ruby{.line-numbers}
5.upto(10) do # 输出5~10
   puts "hello"
end
# 或者缩写成一行：
1.upto(5) { |i| puts i }
```

### `downto`
同样的意思：
```ruby{.line-numbers}
15.downto(10) {|i| puts i }
15
14
13
12
11
10
```

## Strings
### Creating Strings
虽然有一堆花里胡哨的方法，显然绕过构造函数直接写最简单

### Quoting Strings `''`/`""`
单引号和双引号会带来不一样的结果：
```ruby{.line-numbers}
myString = "This is also my string.\nGet your own string"

puts myString
This is also my string.
Get your own string
```
```ruby{.line-numbers}
myString = 'This is also my string.\nGet your own string'

puts myString
This is also my string.\nGet your own string
```
可以看到==单引号里面`\`不会被转义！==

### General Delimited Strings `%`
可以自定义字符串被什么符号括起来，只要前面加上`%`:
```ruby{.line-numbers}
myString = %&This is my String&
```
其实只是为了避免你想输出`''`和`""`

其实用`\`也能输出引号

### Here Documents `<<`
可以创建一大段的文字，`<<`后面跟上你想要的终止符就行：
```ruby{.line-numbers}
myText = <<DOC
Please Detach and return this coupon with your payment.
Do not send cash or coins.

Please write your name and account number on the check and
make checks payable to:

        Acme Corporation

Thank you for your business.
DOC
```
## String Concatenation and Comparison
### Concatenating Strings
最正常的写法：
```ruby{.line-numbers}
myString = "Welcome " + "to " + "Ruby!"
=> "Welcome to Ruby!"
```
甚至可以省略`+`:
```ruby{.line-numbers}
myString = "Welcome " "to " "Ruby!"
=> "Welcome to Ruby!"
```
甚至可以用`<<`替代：
```ruby{.line-numbers}
myString = "Welcome " << "to " << "Ruby!"
=> "Welcome to Ruby!"
```
还可以用`concat`方法：
```ruby{.line-numbers}
myString = "Welcome ".concat("to ").concat("Ruby!")
=> "Welcome to Ruby!"
```

### Freezing a String `freeze`
让string不可更改：
```ruby{.line-numbers highlight=[4]}
myString = "Welcome " << "to " << "Ruby!"
=> "Welcome to Ruby!"

myString.freeze

myString << "hello"
TypeError: can't modify frozen string
```

### Accessing String Elements
`[]`可以实现很多花活

判断字符串是否存在：
```ruby{.line-numbers}
myString = "Welcome to Ruby!"

myString["Ruby"]
=> "Ruby"

myString["Perl"]
=> nil
```
直接用单个整数进行索引会==返回字符对应的ASCII码==，可以用`chr`转回来：
```ruby{.line-numbers}
myString[3].chr
=> "c"
```
substring:
```ruby{.line-numbers}
myString[11, 4]
=> "Ruby"

myString[0..6]
=> "Welcome"
```
查找索引：
```ruby{.line-numbers}
myString.index("Ruby")
=> 11
```

### Comparing Strings
比较相等用`==`或者`eql?`:
```ruby{.line-numbers}
"John" == "Fred"
=> false

"John".eql? "John"
=> true
```
`<=>`是个很特殊的方法：
```ruby{.line-numbers}
"Apples" <=> "Apples"
=> 0


"Apples" <=> "Pears"
=> -1

"Pears" <=> "Apples"
=> 1
```
和`<=>`类似还有个case insensitive的`casecmp`的方法：
```ruby{.line-numbers}
"Apples".casecmp "apples"
=> 0
```
## String Replacement, Substitution and Insertion
暂时懒得看

## String Conversions
同上

## Directory Handling
同上

## Working with Files
同上

## Working with Dates and Times
同上

## Reference
["Ruby Essentials - Techotopia," .](https://www.techotopia.com/index.php/Ruby_Essentials)