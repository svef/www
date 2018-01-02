import React from 'react'
import { connect } from 'react-redux'

export const Hexagon = ({ user, ...props }) => (
  <svg
    style={{ fill: 'transparent' }}
    className="svg-hexagon-buffered"
    viewBox="0 0 190 210"
    xmlns="http://www.w3.org/2000/svg"
  >
    {user && (
      <pattern
        id="avatar"
        patternUnits="userSpaceOnUse"
        width="190"
        height="210"
      >
        <image
          xlinkHref={
            user.photoURL ||
            `https://api.adorable.io/avatars/210/${user.email}.png`
          }
          x="0"
          y="0"
          width="190"
          height="210"
        />
      </pattern>
    )}

    <path
      className="hexagon"
      fill={user ? 'url(#avatar)' : ''}
      d="M179.900651,143.933364 C179.896894,149.457974 176.022503,156.171679 171.240383,158.932637 L103.586843,197.992427 C98.8076649,200.751686 91.0510903,200.750588 86.2669572,197.992802 L18.7059454,159.047658 C13.9196145,156.288606 10.0425734,149.570834 10.046328,144.048761 L10.0993493,66.0666357 C10.1031056,60.5420255 13.977497,53.8283212 18.7596173,51.0673628 L86.4131574,12.0075732 C91.1923351,9.24831368 98.9489097,9.24941241 103.733043,12.0071976 L171.294055,50.9523421 C176.080386,53.7113942 179.957427,60.4291661 179.953672,65.9512395 L179.900651,143.933364 Z"
    />
    <path
      className="logo-graphic logo-awards"
      d="M68.4054802,149.263611 C53.1421328,145.039025 44.4060751,130.016865 48.930241,115.776659 C52.4414202,104.722665 64.8460635,98.35532 76.7023231,101.442517 C76.3240398,102.285403 75.9889164,103.153678 75.7045693,104.04734 C75.1764961,105.707724 74.8109069,107.370647 74.5900301,109.031031 C71.8379562,108.599433 69.0325672,109.020876 66.5445298,110.280128 C63.6020448,111.767872 61.4592862,114.240677 60.5046922,117.233938 C58.1410568,124.672662 62.7058436,132.522674 70.6802572,134.731441 C74.7905964,135.866291 79.2106709,135.594638 83.1153663,134.02819 C87.0886096,138.090292 92.2500176,141.225727 98.3000105,142.898805 C99.2546044,143.16538 100.219354,143.386257 101.18918,143.586823 C91.9402824,150.22836 79.8072921,152.416817 68.4054802,149.263611 M72.2720933,96.3953559 C68.2353797,96.1694015 64.2773693,96.788872 60.6392494,98.1319044 C61.3551948,97.0173652 62.3757979,96.0932371 63.6325106,95.4585337 C65.4909222,94.514095 67.6286032,94.3059123 69.6520377,94.8695289 C70.6726407,95.1487984 71.568842,95.6921045 72.2720933,96.3953559 M43.8145316,97.1620776 C47.3612542,85.9963754 59.9842354,79.6061815 71.9522028,82.9142556 C77.1288438,84.3486853 81.3305803,87.9512618 83.3260878,92.6201401 C81.647932,94.0698026 80.1551096,95.7200315 78.8983968,97.5530549 C78.7232187,97.4997398 78.5531182,97.4388083 78.3804789,97.3956485 C78.2687711,97.3601051 78.1519856,97.3372558 78.0326614,97.30679 C77.0247524,94.1789716 74.3691534,91.668085 70.9646043,90.7312627 C67.7580827,89.8401392 64.3713054,90.1752626 61.4288204,91.6630073 C58.4837966,93.1507521 56.3410379,95.6184789 55.3915216,98.6168178 C55.1401791,99.4140053 54.9624621,100.234042 54.8634484,101.054079 C50.0803236,104.214902 46.3533452,108.815232 44.5355546,114.433627 C42.2887046,108.94725 41.996741,102.879486 43.8145316,97.1620776 M80.1246438,130.489084 C77.5122046,131.293888 74.7068156,131.342125 71.9953626,130.588098 C66.4658266,129.062271 63.3024648,123.619054 64.9374608,118.457646 C65.5416984,116.568769 66.8923473,115.009937 68.74822,114.070576 C70.4695357,113.199763 72.4320386,112.966192 74.3259935,113.380019 C74.374231,116.647472 74.9886239,119.8413 76.0803137,122.870104 C75.2602769,123.144296 74.346304,123.184917 73.4678745,122.94373 L72.1502303,127.079457 C74.074651,127.610069 76.0726973,127.513594 77.8625609,126.868736 C78.5277301,128.115293 79.2842965,129.328846 80.1246438,130.489084 M127.98128,63.1165871 L125.508476,66.7648623 C142.980591,77.0572126 151.076868,97.1773105 145.191898,115.685262 C142.411897,124.446707 136.138488,131.672171 127.529372,136.033853 C118.917716,140.390457 109.003649,141.360284 99.6176547,138.760539 C84.3492297,134.538492 75.613172,119.521409 80.1398767,105.276126 C83.6840605,94.1104237 96.3095806,87.717691 108.275009,91.0308428 C112.794097,92.2824779 116.523615,95.0980222 118.770465,98.9646353 C121.014776,102.82871 121.517461,107.27925 120.176967,111.491142 C118.036747,118.229153 110.425384,122.085611 103.204998,120.090103 C97.6754623,118.559199 94.5070229,113.118521 96.1496353,107.957113 C96.7487953,106.068236 98.101983,104.509404 99.9603946,103.572582 C101.816267,102.628143 103.956487,102.419961 105.974844,102.983577 C107.477822,103.397404 108.714224,104.331687 109.463174,105.616327 C110.209585,106.900967 110.374608,108.378556 109.927777,109.779981 C109.265146,111.864347 106.909127,113.060128 104.67751,112.440658 L103.362405,116.578924 C108.038899,117.873719 112.976892,115.372988 114.363084,111.006228 C115.157733,108.49788 114.86323,105.854975 113.527814,103.559888 C112.192399,101.259723 109.976014,99.5866446 107.287411,98.8427722 C104.080889,97.9567263 100.694112,98.2867721 97.7541655,99.7745168 C94.8066029,101.267339 92.6638442,103.735066 91.7143279,106.728327 C89.3481537,114.172129 93.9154793,122.019602 101.894971,124.22837 C111.555156,126.899201 121.743415,121.737793 124.612275,112.722466 C126.303125,107.401113 125.67096,101.785257 122.837644,96.9031186 C120.956383,93.6788254 118.260163,91.0359204 115.000326,89.1571983 C113.040362,75.036317 104.52772,62.5885139 91.6559352,55 L89.1856696,58.6482752 C99.1048144,64.4951629 106.170333,73.5155677 109.183904,83.9475528 C105.675264,79.8981451 101.458295,76.3768106 96.7691058,73.6145814 L94.3039178,77.2628565 C98.3101657,79.626492 101.930514,82.609598 105.007556,86.0217635 C98.6072069,85.3210509 92.3058715,86.7859464 87.0987648,89.9036095 C84.4152388,84.5594069 79.3807714,80.4693781 73.2647694,78.7785283 C58.8544634,74.7925909 43.6520475,82.4902738 39.3792242,95.9383695 C36.6525384,104.519559 38.0082648,113.798923 43.0960473,121.397592 L43.195061,121.341738 C42.1693803,135.602254 51.7991004,149.169674 67.0929136,153.399338 C81.3178862,157.337038 96.5609231,153.88679 107.269639,144.401782 C115.005404,144.907006 122.748786,143.35833 129.735601,139.824302 C139.426252,134.916775 146.49177,126.777338 149.627205,116.90897 C156.093563,96.55784 147.189944,74.4396958 127.98128,63.1165871"
    />
    <path
      className="logo-graphic logo-conf"
      d="M66.8761129,116.383667 C66.8761129,106.071035 76.1825271,96.4570433 81.6222536,88.4512422 C87.1762232,80.2718796 89.0260817,72.3935035 87.670544,62.4763285 C106.481101,73.0174463 117.279265,90.8283763 112.351436,112.066598 C115.163572,108.375669 118.043815,104.774816 117.925178,99.9370622 C128.723343,115.24563 120.699966,136.40476 106.404206,147.176561 C114.790085,136.138925 111.617644,123.075673 98.9784084,117.96769 C100.599781,120.8721 102.990097,127.847517 97.7744625,128.425323 C87.2838753,129.585329 98.7521193,114.661233 100.439401,112.453266 C108.651719,101.699041 107.436788,88.4007116 94.2043674,82.5062099 C99.751746,94.7038519 92.7279957,100.420398 85.5592447,109.75757 C76.8745763,121.067631 71.294243,137.246204 84.2937833,148.233309 C72.4476583,142.723279 66.8761129,128.818583 66.8761129,116.383667 M91.2318512,147.42482 C80.2381552,143.685557 78.8035262,129.400783 83.373248,120.443689 C87.8726663,111.625004 100.050535,104.207994 100.797509,93.8909687 C106.349282,104.884665 92.9938305,111.119699 89.9883596,120.098763 C86.1700056,131.503294 102.001455,138.076663 104.890486,126.977512 C113.078637,136.411351 101.819106,149.729454 91.2318512,147.42482 M120.157311,95.8199186 C116.677292,92.1970959 116.136835,86.8650215 113.695988,82.5545435 C110.165439,76.3173127 105.261776,70.6117514 99.8528071,65.9387715 C94.3911108,61.221852 88.4592604,58.1175169 82.055059,55 C83.0898373,60.6726066 84.3113591,66.3144554 83.8104473,72.1276688 C82.771275,84.1495522 72.3312183,92.6299013 66.8870979,102.852457 C58.1826567,119.200197 64.5561003,142.732067 81.4201313,151.491433 C91.9480672,156.957523 103.187825,156.258883 112.147116,147.767549 C127.187653,133.513532 132.557076,112.727889 120.157311,95.8199186"
    />
    <path
      className="logo-graphic logo-svef"
      d="M142.613169,96.8376543 L160,103.463096 L160,106.648105 L142.613169,113.287498 L142.613169,109.520006 L154.647741,105.055198 L142.613169,100.605146 L142.613169,96.8376543 Z M118.004115,115.061728 L118.004115,110.246914 L120.411523,110.246914 L120.411523,100.082305 L118.004115,100.082305 L118.004115,95.2674897 L139.403292,95.2674897 L139.403292,101.687243 L133.518519,101.687243 L133.518519,100.082305 L128.703704,100.082305 L128.703704,103.024691 L132.44856,103.024691 L132.44856,107.037037 L128.703704,107.037037 L128.703704,110.246914 L131.378601,110.246914 L131.378601,115.061728 L118.004115,115.061728 Z M94.4650206,115.061728 L94.4650206,110.246914 L96.3374486,110.246914 L96.3374486,100.082305 L94.4650206,100.082305 L94.4650206,95.2674897 L115.329218,95.2674897 L115.329218,101.687243 L109.711934,101.687243 L109.711934,100.082305 L104.62963,100.082305 L104.62963,103.024691 L108.909465,103.024691 L108.909465,107.037037 L104.62963,107.037037 L104.62963,110.246914 L109.711934,110.246914 L109.711934,108.641975 L115.329218,108.641975 L115.329218,115.061728 L94.4650206,115.061728 Z M77.8993847,115.329218 L70.9360761,100.082305 L69.3209877,100.082305 L69.3209877,95.2674897 L81.090535,95.2674897 L81.090535,100.082305 L79.2008493,100.082305 L82.4468709,108.505386 L85.8502655,100.082305 L84.0329218,100.082305 L84.0329218,95.2674897 L92.8600823,95.2674897 L92.8600823,100.082305 L91.2447253,100.082305 L84.6895718,115.329218 L77.8993847,115.329218 Z M50.8643308,115.061728 L50.8643308,108.641975 L55.7453981,108.641975 C56.3278012,110.438883 57.4244511,111.304156 59.0358822,111.304156 C60.2001539,111.304156 60.7822897,110.87702 60.7822897,110.022748 C60.7822897,109.576294 60.5794242,109.206306 60.1739604,108.911979 C59.7374922,108.589212 58.8175144,108.143026 57.4140272,107.57369 C55.6467718,106.842568 54.3472564,106.211254 53.5157484,105.67948 C52.7358253,105.195732 52.0705654,104.526319 51.5197013,103.671779 C50.96857,102.826897 50.6930043,101.892133 50.6930043,100.866684 C50.6930043,99.0247935 51.3478403,97.5866965 52.6577796,96.5523935 C53.9570276,95.5175539 55.5580348,95 57.4602666,95 C59.3627656,95 60.9739295,95.4958215 62.3662551,96.4872428 L62.3662551,95.2674897 L67.18107,95.2674897 L67.18107,100.884774 L62.3568362,100.884774 C61.7642764,99.3362917 60.7144006,98.5584851 59.2072087,98.5584851 C58.1469089,98.5584851 57.6166254,98.9716697 57.6166254,99.7980389 C57.6166254,100.196735 57.7673713,100.49616 58.0685959,100.695776 C58.3596638,100.904783 59.3004894,101.365457 60.8910727,102.078067 C63.0223634,103.046904 64.4464312,103.754415 65.164078,104.200869 C65.5278461,104.419267 65.8996326,104.725399 66.2791702,105.119803 C66.6587078,105.513938 66.9730291,105.920147 67.2224013,106.338161 C67.7941132,107.268899 68.0798356,108.276104 68.0798356,109.358848 C68.0798356,111.021366 67.4041517,112.426999 66.052784,113.576403 C64.7014164,114.744857 62.9967045,115.329218 60.938114,115.329218 C59.0254583,115.329218 57.294553,114.813811 55.6790123,113.783128 L55.6790123,115.061728 L50.8643308,115.061728 Z M47.3868313,113.287498 L30,106.648105 L30,103.463096 L47.3868313,96.8376543 L47.3868313,100.605146 L35.403831,105.055198 L47.3868313,109.520006 L47.3868313,113.287498 Z"
    />
  </svg>
)

Hexagon.defaultProps = {
  image: 'https://api.adorable.io/avatars/210/abott@adorable.png',
}

const mapStateToProps = state => ({
  user: state.user,
})

const mapDispatchToProps = dispatch => ({})

export default connect(mapStateToProps, mapDispatchToProps)(Hexagon)
