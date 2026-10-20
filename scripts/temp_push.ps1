
          $sig = @'
          using System;
          using System.Runtime.InteropServices;
          public class CredReader {
              [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
              public static extern bool CredReadW(string target, int type, int reservedFlag, out IntPtr credentialPtr);
              [DllImport("advapi32.dll", SetLastError = true)]
              public static extern void CredFree(IntPtr credentialPtr);
              [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
              public struct CREDENTIAL {
                  public int Flags;
                  public int Type;
                  public string TargetName;
                  public string Comment;
                  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
                  public int CredentialBlobSize;
                  public IntPtr CredentialBlob;
                  public int Persist;
                  public int AttributeCount;
                  public IntPtr Attributes;
                  public string TargetAlias;
                  public string UserName;
              }
          }
          '@
          Add-Type -TypeDefinition $sig
          $ptr = [IntPtr]::Zero
          $success = [CredReader]::CredReadW('GitHub - https://api.github.com/tallermastertech-dev', 1, 0, [ref]$ptr)
          if ($success) {
              $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][CredReader+CREDENTIAL])
              $bytes = New-Object byte[] $cred.CredentialBlobSize
              [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
              $token = [System.Text.Encoding]::UTF8.GetString($bytes)
              [CredReader]::CredFree($ptr)
              $cleanToken = $token.Trim()
              $remoteUrl = "https://x-access-token:$cleanToken@github.com/Seminuevos/Seminuevos-lading-page.git"
              & "C:\Users\maste\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe" push $remoteUrl main
          } else {
              & "C:\Users\maste\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe" push origin main
          }
        