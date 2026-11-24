用户与app的互动并不是每次都开始于同一个位置，可以只调用app的某个特定的activity

### Configuring the manifest
##### 1. declare activities
放在application里面
```xml
<manifest ... >
    <application ... >
    <activity android:name=".ExampleActivity" />
    ...
    </application ... >
    ...
</manifest >
```
唯一必须的是name(注意name以.开头)
注：发布了app之后，就不应该更改activity的名字了
##### 2. declare intent filters
用来支持隐式请求
eg.
```xml
<activity android:name=".ExampleActivity"
    <intent-filter>
        <action android:name="android.intent.action.SEND"
        <category android:name="android.intent.category.DEFAULT"
        <data android:mimeType="text/plain" />
    </intent-filter>
</activity>
```
其中：
- action说明这个activity用来发送信息
- category使得activity能够接收launch请求
- data说明这个activity能够发送的数据类型

##### 3. 如何调用上述的activity
```java
// Create the text message with a string
Intent sendIntent = new Intent();
sendIntent.setAction(Intent.ACTION_SEND);
sendIntent.setType("text/plain");
sendIntent.putExtra(Intent.EXTRA_TEXT, textMessage)
// Start the activity
startActivity(sendIntent);
```
当然，如果你压根不想让别的程序调用activity，你就不应该写intent filter
##### 4. Declare permissions
You can use the manifest's \<activity> tag to control which apps can start a particular activity. (A parent activity cannot launch a child activity unless both activities have the same permissions in their manifest. If you declare a \<uses-permission> element for a parent activity, each child activity must have a matching \<uses permission> element)
被调用的应用应该写成：
```xml
<manifest>
<activity android:name="...."
    android:permission="com.google.socialapp.permission.SHARE_POST"
/>
...
```
而调用的应用应该写：
```xml
<manifest>
    <uses-permission android:name="com.google.socialapp.permission.SHARE_POST"
</manifest>
```
### Managing the activity lifecycle
应用在不同的阶段之间切换时，要调用不同的函数：
##### 1. onCreate()
You must implement this callback. For example, your app should create views and bind data to lists here. Most importantly, this is where you must call ==setContentView()== to define the layout for the activity's user interface.

This method receives the parameter ==savedInstanceState==, which is a Bundle object containing the activity's previously saved state. If the activity has never existed before, the value of the Bundle object is null.

eg.
```java
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
}
```

When onCreate() finishes, the next callback is always ==onStart().==
##### 2. onStart()
反正好像没啥事情
##### 3. onResume()
暂时没用

The system invokes this callback just before the activity
starts interacting with the user. At this point, the activity
is at the top of the activity stack, and captures all user
input. Most of an app’s core functionality is implemented in the onResume() method.

Here is an example of a ==lifecycle-aware component==(**这个很有意思，他不是直接写在onResume()里面，而是用@来修饰**) that accesses the camera when the component receives the ON_RESUME event:
```java
public class CameraComponent implements LifecycleObserver
    ...
    @OnLifecycleEvent(Lifecycle.Event.ON_RESUME)
    public void initializeCamera() {
        if (camera == null) {
            getCamera();
        }
    }
    ...
}
```

The ==onPause()== callback always follows onResume().
##### 4. onPause()

for example, the user taps the Back or Recents button. When the system calls onPause() for your activity, it technically means your activity is ==still partially visible==, but most often is an indication that the user is leaving the activity, and the activity will soon enter the ==Stopped or Resumed== state.

You should not use onPause() to save application or user data, make network calls, or execute database transactions.
##### 5. onStop()
when the activity is ==no longer visible== to the user.

The next callback that the system calls is either ==onRestart()==, if the activity is coming back to interact with the user, or by ==onDestroy()== if this activity is completely terminating.
##### 6. onRestart()
##### 7. onDestroy()




